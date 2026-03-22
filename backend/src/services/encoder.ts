/**
 * src/services/encoder.ts
 *
 * Short URL generation — Counter + Base62 algorithm (BEST approach).
 *
 * Base62 kya hai?
 *   Characters: a-z (26) + A-Z (26) + 0-9 (10) = 62 total
 *   7 chars → 62^7 = 3,500 Billion combinations
 *   Humein 120 Billion chahiye (100 years) → 7 chars kaafi hain
 *
 * Counter approach kyun?
 *   - Kabhi collision nahi hoti (har number unique hota hai)
 *   - DB check nahi karna padta
 *   - Random approach mein DB bhar ne pe collisions badhte hain
 *
 * Flow:
 *   1. DB se current counter value lo (BIGSERIAL auto-increment)
 *   2. Counter ko Base62 mein convert karo
 *   3. 7 chars ka code milta hai
 */

// Base62 character set — URL-safe characters
const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = 62;

/**
 * Ek number ko Base62 string mein convert karta hai.
 *
 * Example:
 *   toBase62(100000000000) → "1L9zO9O" (7 chars)
 *
 * @param num - Positive integer (DB counter value)
 * @returns   - Base62 encoded string
 */
export function toBase62(num: number): string {
  if (num === 0) return BASE62_CHARS[0];

  let result = '';
  let n = num;

  // Jab tak number > 0 hai, remainder nikalo aur character map karo
  while (n > 0) {
    result = BASE62_CHARS[n % BASE] + result; // prepend karo
    n = Math.floor(n / BASE);
  }

  return result;
}

/**
 * Base62 string ko wapas number mein convert karta hai.
 * Analytics ya debugging ke liye useful.
 *
 * @param str - Base62 encoded string
 * @returns   - Original number
 */
export function fromBase62(str: string): number {
  let result = 0;

  for (const char of str) {
    result = result * BASE + BASE62_CHARS.indexOf(char);
  }

  return result;
}

/**
 * DB ke BIGSERIAL id se 7-character short code generate karta hai.
 *
 * Hum id ko seedha use karte hain — isse guaranteed unique codes milte hain.
 * id = 1 → "b" (chhota), id = 100000000000 → "1L9zO9O" (7 chars)
 *
 * @param id - DB mein insert hone ke baad mila auto-increment id
 * @returns  - 7-char short URL code
 */
export function generateShortCode(id: number): string {
  // Large number se shuru karo taaki code hamesha 7 chars ka ho
  // 62^6 = 56 Billion — is se bada number 7+ chars deta hai
  const offset = 56_800_235_584; // 62^6
  return toBase62(id + offset);
}
