/**
 * src/services/maliciousCheck.ts
 *
 * Malicious URL detection.
 * Google Safe Browsing API se check karta hai.
 * API key nahi hai toh basic pattern matching karta hai.
 */

import logger from '../utils/logger';

// Known malicious patterns (basic fallback)
const SUSPICIOUS_PATTERNS = [
  /phishing/i,
  /malware/i,
  /\.tk$/i,
  /\.ml$/i,
  /bit\.ly\/[a-z0-9]{5,}/i, // nested shorteners
];

const BLOCKED_DOMAINS = [
  'malware.testing.google.test',
  'testsafebrowsing.appspot.com',
];

/**
 * URL ko malicious check karta hai.
 * Google Safe Browsing API available ho toh use karta hai,
 * warna basic pattern matching.
 */
export async function isMaliciousUrl(url: string): Promise<{ malicious: boolean; reason?: string }> {
  try {
    // Basic domain check
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();

    if (BLOCKED_DOMAINS.some((d) => domain.includes(d))) {
      return { malicious: true, reason: 'Known malicious domain' };
    }

    // Google Safe Browsing API (agar key available ho)
    const apiKey = process.env.SAFE_BROWSING_KEY;
    if (apiKey) {
      const result = await checkGoogleSafeBrowsing(url, apiKey);
      if (result.malicious) return result;
    }

    // Basic pattern check
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(url)) {
        logger.warn('Suspicious URL pattern detected', { url, pattern: pattern.toString() });
        // Pattern match pe block mat karo — sirf log karo
        // Real production mein Safe Browsing API use karo
      }
    }

    return { malicious: false };
  } catch (err) {
    // URL parse error ya network error — block mat karo
    logger.debug('Malicious check error (non-critical)', { error: (err as Error).message });
    return { malicious: false };
  }
}

async function checkGoogleSafeBrowsing(
  url: string,
  apiKey: string
): Promise<{ malicious: boolean; reason?: string }> {
  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'url-shortener', clientVersion: '1.0' },
          threatInfo: {
            threatTypes:      ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes:    ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries:    [{ url }],
          },
        }),
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) return { malicious: false };

    const data = await response.json() as { matches?: Array<{ threatType: string }> };
    if (data.matches && data.matches.length > 0) {
      const threatType = data.matches[0].threatType;
      return { malicious: true, reason: `Google Safe Browsing: ${threatType}` };
    }

    return { malicious: false };
  } catch {
    return { malicious: false }; // API fail hone pe block mat karo
  }
}
