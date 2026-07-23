import { randomUUID, createHash } from 'crypto';

export function generateInviteToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomUUID();
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
