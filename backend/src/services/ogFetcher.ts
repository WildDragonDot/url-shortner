/**
 * src/services/ogFetcher.ts
 *
 * OG (Open Graph) meta tag fetcher.
 * WhatsApp/Slack/Twitter pe share karne pe preview card dikhane ke liye.
 * Async background mein fetch hota hai — URL creation slow nahi hoti.
 */

import prisma from '../db/prisma';
import logger from '../utils/logger';

interface OGData {
  title:       string | null;
  description: string | null;
  image:       string | null;
}

/**
 * HTML se OG meta tags parse karta hai.
 */
function parseOGTags(html: string): OGData {
  const getTag = (property: string): string | null => {
    // og:title, og:description, og:image
    const ogMatch = html.match(
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')
    );
    if (ogMatch) return ogMatch[1];

    // Fallback: name= attribute
    const nameMatch = html.match(
      new RegExp(`<meta[^>]+name=["']${property.replace('og:', '')}["'][^>]+content=["']([^"']+)["']`, 'i')
    );
    if (nameMatch) return nameMatch[1];

    return null;
  };

  // <title> tag fallback
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  return {
    title:       getTag('og:title') || (titleTagMatch ? titleTagMatch[1].trim() : null),
    description: getTag('og:description'),
    image:       getTag('og:image'),
  };
}

/**
 * URL se OG tags fetch karta hai aur DB mein save karta hai.
 * Fire-and-forget — await mat karo.
 */
export async function fetchAndSaveOGTags(shortUrl: string, longUrl: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(longUrl, {
      signal:  controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URLShortener/1.0; +http://localhost:3000)',
        'Accept':     'text/html',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return;

    // Sirf pehle 50KB read karo — OG tags head mein hote hain
    const reader = response.body?.getReader();
    if (!reader) return;

    let html = '';
    let bytesRead = 0;
    const maxBytes = 50 * 1024; // 50KB

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.length;
      // </head> mil gaya toh stop karo
      if (html.includes('</head>')) break;
    }
    reader.cancel();

    const ogData = parseOGTags(html);

    // DB mein save karo
    await prisma.url.update({
      where: { shortUrl },
      data: {
        ogTitle:       ogData.title,
        ogDescription: ogData.description,
        ogImage:       ogData.image,
        ogFetchedAt:   new Date(),
      },
    });

    logger.debug('OG tags fetched', { shortUrl, title: ogData.title });
  } catch (err) {
    // OG fetch fail hone pe koi problem nahi — optional feature hai
    logger.debug('OG fetch failed (non-critical)', { shortUrl, error: (err as Error).message });
  }
}
