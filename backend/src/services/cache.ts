/**
 * src/services/cache.ts
 *
 * In-memory LRU (Least Recently Used) Cache.
 *
 * LRU kya hai?
 *   Cache full hone pe sabse purana (least recently used) entry hata do.
 *   Naya entry add karo.
 *
 * Kyun LRU?
 *   URL shortener mein 20% URLs = 80% traffic (Pareto principle).
 *   Recently accessed URLs dobara access hone ki probability zyada hai.
 *   LRU inhi URLs ko cache mein rakhta hai.
 *
 * Hum Node.js Map use kar rahe hain — insertion order maintain karta hai.
 * Sabse pehla entry = oldest (LRU candidate).
 *
 * Production mein: Redis use karo (distributed cache, multiple servers ke liye).
 * Local development mein: Yeh in-memory cache kaafi hai.
 */

interface CacheEntry {
  long_url:   string;
  expires_at: Date | null;
  status:     string;
}

/**
 * LRU Cache class.
 * Generic nahi — specifically URL shortener ke liye optimized.
 */
class LRUCache {
  // Map insertion order maintain karta hai — oldest entry sabse pehle hoti hai
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;

  /**
   * @param maxSize - Cache mein max kitni entries rakhni hain (default: 1000)
   */
  constructor(maxSize = 1000) {
    this.cache   = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Cache se entry fetch karo.
   * Access hone pe entry ko "recently used" mark karo (Map ke end mein move karo).
   *
   * @param key - short_url code (e.g., "abc1234")
   * @returns   - CacheEntry ya undefined agar miss ho
   */
  get(key: string): CacheEntry | undefined {
    if (!this.cache.has(key)) return undefined;

    // LRU trick: entry delete karo aur wapas add karo — ab yeh "most recent" hai
    const entry = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry;
  }

  /**
   * Cache mein entry store karo.
   * Agar cache full hai toh sabse purani entry hata do (LRU eviction).
   *
   * @param key   - short_url code
   * @param value - URL data
   */
  set(key: string, value: CacheEntry): void {
    // Agar key already hai toh pehle hata do (order update ke liye)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Cache full hai? Sabse purani entry nikalo (Map ka first entry = oldest)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
  }

  /**
   * Cache se specific entry hata do.
   * URL update ya delete hone pe call karo — stale data serve na ho.
   *
   * @param key - short_url code
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Poora cache clear karo.
   * Testing ya emergency situations ke liye.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cache ki current size.
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance — poori app mein ek hi cache object hoga
// 1000 most-recently-used URLs cache mein rahenge
const urlCache = new LRUCache(1000);

export default urlCache;
export type { CacheEntry };
