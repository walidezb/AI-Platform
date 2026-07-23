import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @Public()
  @SkipThrottle()
  async check() {
    const checks: Record<string, 'ok' | 'degraded' | 'down'> = {};

    // ── Database ──
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'down';
    }

    // ── Redis ──
    try {
      await this.cache.set('health:ping', 'pong', 5);
      const pong = await this.cache.get<string>('health:ping');
      checks.redis = pong === 'pong' ? 'ok' : 'degraded';
    } catch {
      checks.redis = 'degraded'; // degraded, not down (cache is optional)
    }

    // ── AI Service ──
    try {
      const aiUrl = process.env.AI_SERVICE_URL;
      const res = await fetch(`${aiUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      checks.aiService = res.ok ? 'ok' : 'degraded';
    } catch {
      checks.aiService = 'degraded';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');
    const anyDown = Object.values(checks).some((v) => v === 'down');

    return {
      status: anyDown ? 'unhealthy' : allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      checks,
    };
  }
}
