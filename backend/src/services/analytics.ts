/**
 * src/services/analytics.ts
 *
 * Async analytics processor — Prisma version.
 *
 * Kyun async?
 *   Redirect response user ko PEHLE bhejte hain.
 *   Analytics DB insert BAAD mein hota hai — background mein.
 *   Isse redirect latency zero rehti hai (< 10ms target).
 */

import prisma from '../db/prisma';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import logger from '../utils/logger';

export interface AnalyticsInput {
  shortUrl:  string;
  ipAddress: string;
  userAgent: string;
  referrer:  string;
  source:    'direct' | 'qr_scan' | 'api';
  abVariant?: string;
}

/**
 * Ek click ka analytics record DB mein save karta hai.
 * Fire-and-forget — await mat karo.
 *
 * @param data - Click ka raw data
 */
export async function emitAnalytics(data: AnalyticsInput): Promise<void> {
  try {
    // IP → country/city
    const geo = geoip.lookup(data.ipAddress);

    // User-Agent → device/browser/OS
    const parser    = new UAParser(data.userAgent);
    const uaResult  = parser.getResult();
    const device    = uaResult.device.type  || 'desktop';
    const browser   = uaResult.browser.name || 'Unknown';
    const os        = uaResult.os.name      || 'Unknown';

    await prisma.analytics.create({
      data: {
        shortUrl:  data.shortUrl,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        source:    data.source,
        referrer:  data.referrer || null,
        country:   geo?.country  || null,
        city:      geo?.city     || null,
        device,
        browser,
        os,
        abVariant: data.abVariant || null,
      },
    });
  } catch (err) {
    // Analytics fail hone pe redirect fail mat karo
    logger.error('Analytics insert failed', { error: (err as Error).message });
  }
}

/**
 * Summary analytics — total, unique, today, week, month clicks.
 */
export async function getAnalyticsSummary(shortUrl: string) {
  const now       = new Date();
  const today     = new Date(now); today.setHours(0, 0, 0, 0);
  const weekAgo   = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo  = new Date(now); monthAgo.setDate(now.getDate() - 30);

  const [total, unique, todayCount, weekCount, monthCount] = await Promise.all([
    prisma.analytics.count({ where: { shortUrl } }),
    prisma.analytics.findMany({
      where:  { shortUrl },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
    }).then((r) => r.length),
    prisma.analytics.count({ where: { shortUrl, clickedAt: { gte: today } } }),
    prisma.analytics.count({ where: { shortUrl, clickedAt: { gte: weekAgo } } }),
    prisma.analytics.count({ where: { shortUrl, clickedAt: { gte: monthAgo } } }),
  ]);

  return {
    total_clicks:       total,
    unique_clicks:      unique,
    clicks_today:       todayCount,
    clicks_this_week:   weekCount,
    clicks_this_month:  monthCount,
  };
}

/**
 * Breakdown analytics — country/device/browser/os/referrer ke hisaab se group.
 */
export async function getAnalyticsBreakdown(
  shortUrl: string,
  by: 'country' | 'device' | 'browser' | 'os' | 'referrer'
) {
  // Prisma groupBy use karo
  const grouped = await prisma.analytics.groupBy({
    by:      [by as any],
    where:   { shortUrl },
    _count:  { _all: true },
    orderBy: { _count: { [by]: 'desc' } },
    take:    20,
  });

  const total = grouped.reduce((sum, r) => sum + r._count._all, 0);

  return grouped
    .filter((r) => (r as any)[by] !== null)  // null entries skip karo
    .map((r) => ({
      label:      (r as any)[by] || 'Other',
      count:      r._count._all,
      percentage: total > 0 ? +((r._count._all / total) * 100).toFixed(2) : 0,
    }));
}

/**
 * Time-series — daily click counts.
 */
export async function getAnalyticsTimeseries(shortUrl: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Raw query — Prisma groupBy date truncation support limited hai
  const result = await prisma.$queryRaw<Array<{ date: Date; clicks: bigint }>>`
    SELECT DATE(clicked_at) AS date, COUNT(*) AS clicks
    FROM analytics
    WHERE short_url = ${shortUrl}
      AND clicked_at >= ${since}
    GROUP BY DATE(clicked_at)
    ORDER BY date ASC
  `;

  return result.map((r) => ({
    date:   r.date.toISOString().split('T')[0],
    clicks: Number(r.clicks),
  }));
}
