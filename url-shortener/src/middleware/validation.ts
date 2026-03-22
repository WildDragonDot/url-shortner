/**
 * src/middleware/validation.ts
 *
 * Input validation helpers.
 *
 * Kya validate karta hai?
 *   - URL format (valid URL hai ya nahi)
 *   - Custom alias (allowed characters, length)
 *   - Expiry date (future mein hona chahiye)
 *   - Password length
 *
 * Kyun alag middleware?
 *   Route handlers clean rehte hain — validation logic alag hoti hai.
 *   Reuse kar sakte hain multiple routes mein.
 */

/**
 * URL valid hai ya nahi check karta hai.
 * http:// ya https:// se shuru hona chahiye.
 *
 * @param url - Check karna wala URL string
 * @returns   - true agar valid, false agar invalid
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Sirf http aur https allow karo — ftp, javascript: etc. nahi
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Custom alias valid hai ya nahi check karta hai.
 * Rules:
 *   - Sirf alphanumeric aur hyphen/underscore allowed
 *   - 3 se 16 characters ke beech
 *   - Reserved words nahi hone chahiye (api, health, etc.)
 *
 * @param alias - Check karna wala alias string
 * @returns     - { valid: boolean, error?: string }
 */
export function validateAlias(alias: string): { valid: boolean; error?: string } {
  // Reserved words — system routes ke saath conflict hoga
  const reserved = ['api', 'health', 'create', 'auth', 'dashboard', 'bulk', 'qr', 'unlock'];

  if (alias.length < 3) {
    return { valid: false, error: 'Alias must be at least 3 characters' };
  }

  if (alias.length > 16) {
    return { valid: false, error: 'Alias must be 16 characters or less' };
  }

  // Sirf letters, numbers, hyphen, underscore
  if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
    return { valid: false, error: 'Alias can only contain letters, numbers, hyphens, underscores' };
  }

  if (reserved.includes(alias.toLowerCase())) {
    return { valid: false, error: 'This alias is reserved' };
  }

  return { valid: true };
}

/**
 * Expiry date valid hai ya nahi check karta hai.
 * Future mein hona chahiye.
 *
 * @param expiresAt - ISO date string
 * @returns         - true agar valid future date
 */
export function isValidExpiryDate(expiresAt: string): boolean {
  const date = new Date(expiresAt);
  // Invalid date ya past date → false
  return !isNaN(date.getTime()) && date > new Date();
}
