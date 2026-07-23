import { randomUUID, createHash, timingSafeEqual } from 'crypto';

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

export function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.CLERK_SECRET_KEY || 'unsub-secret-key';
  return createHash('sha256')
    .update(`unsub:${userId}:${secret}`)
    .digest('hex');
}

export function verifyUnsubscribeToken(
  userId: string,
  token: string,
): boolean {
  const expected = generateUnsubscribeToken(userId);
  try {
    return timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}
