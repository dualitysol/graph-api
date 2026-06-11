import { ApiResponse, FilterRequest } from '../dto/types';

const DEFAULT_TTL = 60000; // 60 seconds
const DEFAULT_MAX_SIZE = 1000;

interface CacheEntry {
  data: ApiResponse;
  timestamp: number;
  ttl: number;
}

export class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;
  private maxSize: number;
  private enabled: boolean;

  constructor(ttl: number = DEFAULT_TTL, maxSize: number = DEFAULT_MAX_SIZE, enabled: boolean = true) {
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.enabled = enabled;
  }

  public getKey(filters?: FilterRequest[]): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `query:${filterStr}`;
  }

  public get(key: string): ApiResponse | null {
    if (!this.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(key: string, data: ApiResponse, ttl: number = this.ttl): void {
    if (!this.enabled) return;

    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.enabled,
    };
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

const cacheEnabled = process.env.CACHE_ENABLED !== 'false';
export const queryCache = new QueryCache(DEFAULT_TTL, DEFAULT_MAX_SIZE, cacheEnabled);
