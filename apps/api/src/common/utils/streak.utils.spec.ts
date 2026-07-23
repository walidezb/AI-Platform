import { calculateStreakAction } from './streak.utils';

describe('calculateStreakAction', () => {
  const tz = 'Asia/Riyadh'; // UTC+3

  it('keeps streak when studied same local day', () => {
    // lastActivity: 2026-07-23 22:00 Riyadh = 19:00 UTC
    const last = new Date('2026-07-23T19:00:00Z');
    // now: 2026-07-23 23:30 Riyadh = 20:30 UTC
    const now = new Date('2026-07-23T20:30:00Z');
    expect(calculateStreakAction(last, now, tz)).toBe('keep');
  });

  it('increments streak when studied yesterday local', () => {
    // lastActivity: 2026-07-22 22:00 Riyadh = 19:00 UTC
    const last = new Date('2026-07-22T19:00:00Z');
    // now: 2026-07-23 08:00 Riyadh = 05:00 UTC
    const now = new Date('2026-07-23T05:00:00Z');
    expect(calculateStreakAction(last, now, tz)).toBe('increment');
  });

  it('handles UTC midnight edge case correctly', () => {
    // Bug case: 11 PM local (20:00 UTC previous day)
    const last = new Date('2026-07-22T20:00:00Z'); // 11 PM July 22 Riyadh
    const now = new Date('2026-07-23T05:00:00Z'); // 08 AM July 23 Riyadh
    expect(calculateStreakAction(last, now, tz)).toBe('increment');
  });

  it('resets streak after 2 missed days', () => {
    const last = new Date('2026-07-20T10:00:00Z');
    const now = new Date('2026-07-23T10:00:00Z');
    expect(calculateStreakAction(last, now, tz)).toBe('reset');
  });

  it('resets streak on first activity (null)', () => {
    expect(calculateStreakAction(null, new Date(), tz)).toBe('reset');
  });

  it('works correctly in UTC (no regression)', () => {
    const last = new Date('2026-07-22T10:00:00Z');
    const now = new Date('2026-07-23T10:00:00Z');
    expect(calculateStreakAction(last, now, 'UTC')).toBe('increment');
  });
});
