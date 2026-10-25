import { Temporal } from 'temporal-polyfill';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export const isDateTarget = (value: unknown): value is Calendar_DateTarget => {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('at' in value)) return false;
  return value.kind === 'timed'
    ? value.at instanceof Temporal.ZonedDateTime
    : value.kind === 'allDay' && value.at instanceof Temporal.PlainDate;
};

export const calendarDateTarget_equal = (a: Calendar_DateTarget, b: Calendar_DateTarget) =>
  a.kind === b.kind && a.resourceId === b.resourceId && a.at.toString() === b.at.toString();
