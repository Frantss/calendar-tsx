import { Temporal } from 'temporal-polyfill';

export const calendarClock_candidates = (clock: Temporal.PlainDateTime, timeZone: string) => {
  const earlier = clock.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
  const later = clock.toZonedDateTime(timeZone, { disambiguation: 'later' });
  const candidates = [earlier, later].filter(
    (value, index) => value.toPlainDateTime().equals(clock) && (index === 0 || !value.equals(earlier)),
  );
  return candidates;
};
