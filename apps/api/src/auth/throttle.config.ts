import { Throttle } from '@nestjs/throttler';

export const AuthThrottle = () => Throttle({ default: { ttl: 60000, limit: 5 } });
export const AiThrottle = () => Throttle({ default: { ttl: 60000, limit: 20 } });
export const AssessmentThrottle = () => Throttle({ default: { ttl: 3600000, limit: 30 } });
