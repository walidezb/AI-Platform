import { Throttle, SkipThrottle } from '@nestjs/throttler';

// 5 requests/minute — for auth-adjacent endpoints
export const AuthRateLimit = () =>
  Throttle({ default: { ttl: 60_000, limit: 5 } });

// 20 requests/minute — for AI endpoints
export const AiRateLimit = () =>
  Throttle({ default: { ttl: 60_000, limit: 20 } });

// 30 messages per 10 minutes — for assessment chat
export const ChatRateLimit = () =>
  Throttle({ default: { ttl: 10 * 60_000, limit: 30 } });

// No rate limit — for health check etc.
export { SkipThrottle };
