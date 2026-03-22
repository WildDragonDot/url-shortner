/**
 * src/services/webhook.ts
 *
 * Webhook notification service — Prisma version.
 * Fire-and-forget, HMAC-SHA256 signed, exponential backoff retry.
 */

import crypto from 'crypto';
import prisma from '../db/prisma';
import logger from '../utils/logger';

export interface WebhookPayload {
  event:      string;
  short_url:  string;
  long_url:   string;
  clicked_at: string;
  country?:   string;
  device?:    string;
  source:     string;
}

/**
 * Ek endpoint pe signed POST request bhejta hai.
 * Fail hone pe exponential backoff se retry karta hai (max 3 attempts).
 */
async function sendWebhook(
  endpoint: string,
  secret:   string,
  payload:  WebhookPayload,
  attempt = 1
): Promise<void> {
  const body      = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const response = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature':  `sha256=${signature}`,
        'X-Attempt':    String(attempt),
      },
      body,
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    logger.debug('Webhook delivered', { endpoint, attempt });
  } catch (err) {
    if (attempt < 3) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      setTimeout(() => sendWebhook(endpoint, secret, payload, attempt + 1), delay);
    } else {
      logger.error('Webhook failed after 3 attempts', { endpoint, error: (err as Error).message });
    }
  }
}

/**
 * Ek URL click ke liye saare registered webhooks fire karta hai.
 * Fire-and-forget — await mat karo.
 */
export async function fireWebhooks(
  shortUrl: string,
  userId:   bigint | null,
  payload:  WebhookPayload
): Promise<void> {
  try {
    const hooks = await prisma.webhook.findMany({
      where: {
        AND: [
          { OR: [{ shortUrl }, { shortUrl: null }] },
          ...(userId ? [{ userId }] : []),
        ],
        events: { has: 'click' },
      },
    });

    for (const hook of hooks) {
      sendWebhook(hook.endpoint, hook.secret, payload); // fire and forget
    }
  } catch (err) {
    logger.error('Webhook dispatch error', { error: (err as Error).message });
  }
}
