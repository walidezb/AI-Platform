import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(
      this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
      {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: false,
        tls:
          this.config.get('REDIS_TLS') === 'true'
            ? {}
            : undefined,
      },
    );

    this.redis.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null; // cache miss — fallback to DB
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSecs: number,
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttlSecs, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(`Cache set failed for ${key}: ${err}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // ignore
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // ignore
    }
  }

  /* ── Convenience wrapper: get-or-set ── */
  async getOrSet<T>(
    key: string,
    ttlSecs: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }
    this.logger.debug(`Cache MISS: ${key}`);
    const data = await fetcher();
    await this.set(key, data, ttlSecs);
    return data;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
