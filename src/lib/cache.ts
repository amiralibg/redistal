/**
 * Simple in-memory cache for Redis keys and values
 * Helps reduce unnecessary API calls and improves performance
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 30000; // 30 seconds default

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Get a value from the cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(
      pattern.replace(/\*/g, ".*").replace(/\?/g, ".")
    );

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove expired entries (garbage collection)
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
export const cache = new SimpleCache();

// Auto-cleanup every 60 seconds
if (typeof window !== "undefined") {
  setInterval(() => {
    cache.cleanup();
  }, 60000);
}

/**
 * Cache key generators for consistent cache keys
 */
export const cacheKeys = {
  keys: (connectionId: string, pattern: string) =>
    `keys:${connectionId}:${pattern}`,
  keyInfo: (connectionId: string, key: string) =>
    `keyInfo:${connectionId}:${key}`,
  value: (connectionId: string, key: string) =>
    `value:${connectionId}:${key}`,
  connection: (connectionId: string) => `connection:${connectionId}`,
};
