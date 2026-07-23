import { startOfDay, subDays, isEqual } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * Returns calendar day boundaries in a given timezone.
 * All comparisons use the org's local calendar date, not UTC midnight.
 */
export function getLocalDay(utcDate: Date, timezone: string): Date {
  const tz = timezone || 'UTC';
  const zoned = toZonedTime(utcDate, tz);
  return startOfDay(zoned);
}

export type StreakAction = 'keep' | 'increment' | 'reset';

export function calculateStreakAction(
  lastActivityAt: Date | null,
  nowUtc: Date,
  timezone: string,
): StreakAction {
  const tz = timezone || 'UTC';

  const todayLocal = getLocalDay(nowUtc, tz);
  const yesterdayLocal = subDays(todayLocal, 1);

  if (!lastActivityAt) {
    return 'reset'; // first ever activity -> start at 1
  }

  const lastLocal = getLocalDay(lastActivityAt, tz);

  if (isEqual(lastLocal, todayLocal)) {
    return 'keep'; // already studied today -> no change
  }

  if (isEqual(lastLocal, yesterdayLocal)) {
    return 'increment'; // studied yesterday -> extend streak
  }

  return 'reset'; // missed >= 1 day -> reset to 1
}
