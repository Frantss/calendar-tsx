import { Temporal } from 'temporal-polyfill';
import { createWeeklyRanges } from '#features/background/background-ranges';
import type { Calendar_BackgroundRange, Calendar_WeeklyRule } from '#features/background/background.types';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_Range } from '#dates/date.types';
import type { Calendar_InteractionInput, Calendar_InteractionProposal } from '#calendar-interaction.types';
import type { Calendar_DateTarget, Calendar_Selection } from '#calendar-editing';

export type Calendar_MovementSettings = {
  enabled?: boolean;
  allowConversion?: boolean;
  conversionDuration?: 'reset' | 'preserve';
  defaultTimedMinutes?: number;
  allowResourceChange?: boolean;
  resourceMode?: 'replace-all' | 'replace-source';
  canMove?: (event: Calendar_EventInput<unknown>) => boolean;
};
export type Calendar_ResizeSettings = {
  enabled?: boolean;
  fromStart?: boolean;
  canResize?: (event: Calendar_EventInput<unknown>, edge: 'start' | 'end') => boolean;
};
export type Calendar_ConstraintSettings = {
  preventOverlap?: boolean;
  allowedRanges?:
    | readonly Calendar_BackgroundRange[]
    | ((range: Calendar_Range, timeZone: string) => readonly Calendar_BackgroundRange[]);
  businessHours?: Calendar_WeeklyRule[];
  resourceAvailability?: boolean;
  resourceIds?: readonly string[];
  allow?: (proposal: Calendar_InteractionProposal, input: Calendar_InteractionInput) => boolean | string;
};
export const calendarMovement_place = (
  before: Calendar_EventInput<unknown>,
  target: Calendar_DateTarget,
  settings: Calendar_MovementSettings,
  sourceResourceId?: string,
): Calendar_EventInput<unknown> | string => {
  if (settings.canMove?.(before) === false) return 'event-not-editable';
  let resourceIds = before.resourceIds;
  if (target.resourceId) {
    if (settings.allowResourceChange === false && !before.resourceIds?.includes(target.resourceId))
      return 'resource-change-disabled';
    if (settings.allowResourceChange === false) resourceIds = before.resourceIds;
    else if (settings.resourceMode === 'replace-source') {
      const source = sourceResourceId ?? (before.resourceIds?.length === 1 ? before.resourceIds[0] : undefined);
      if (!source || !before.resourceIds?.includes(source)) return 'source-resource-required';
      resourceIds = [...new Set(before.resourceIds.map(id => (id === source ? target.resourceId! : id)))];
    } else resourceIds = [target.resourceId];
  }
  if (before.kind === 'timed' && Temporal.ZonedDateTime.compare(before.start, before.end) >= 0)
    return 'invalid-source-range';
  if (before.kind === 'allDay' && Temporal.PlainDate.compare(before.start, before.end ?? before.start) > 0)
    return 'invalid-source-range';
  if (before.kind === 'timed' && target.kind === 'timed') {
    const nanoseconds = before.end.epochNanoseconds - before.start.epochNanoseconds;
    return {
      ...before,
      start: target.at,
      end: Temporal.Instant.fromEpochNanoseconds(target.at.epochNanoseconds + nanoseconds).toZonedDateTimeISO(
        target.at.timeZoneId,
      ),
      resourceIds,
    };
  }
  if (before.kind === 'allDay' && target.kind === 'allDay')
    return {
      ...before,
      start: target.at,
      end: target.at.add({ days: before.start.until(before.end ?? before.start).days }),
      resourceIds,
    };
  if (!settings.allowConversion) return 'conversion-unsupported';
  if (target.kind === 'allDay') {
    const days =
      settings.conversionDuration === 'preserve' && before.kind === 'timed'
        ? Math.max(
            1,
            Math.floor(Number(before.end.epochNanoseconds - before.start.epochNanoseconds) / 86_400_000_000_000),
          )
        : 1;
    return { ...before, kind: 'allDay', start: target.at, end: target.at.add({ days: days - 1 }), resourceIds };
  }
  const minutes =
    settings.conversionDuration === 'preserve' && before.kind === 'allDay'
      ? (before.start.until(before.end ?? before.start).days + 1) * 1440
      : (settings.defaultTimedMinutes ?? 60);
  if (!Number.isSafeInteger(minutes) || minutes <= 0) return 'invalid-conversion-duration';
  return { ...before, kind: 'timed', start: target.at, end: target.at.add({ minutes }), resourceIds };
};
const interval = (range: Calendar_Selection | Calendar_EventInput<unknown>, zone: string) =>
  range.kind === 'timed'
    ? { start: range.start.epochNanoseconds, end: range.end.epochNanoseconds }
    : {
        start: range.start.toZonedDateTime(zone).epochNanoseconds,
        end: (range.end ?? range.start).add({ days: 1 }).toZonedDateTime(zone).epochNanoseconds,
      };
const contains = (ranges: readonly Calendar_BackgroundRange[], wanted: ReturnType<typeof interval>, zone: string) => {
  const spans = ranges
    .map(range =>
      'allDay' in range
        ? interval({ kind: 'allDay', start: range.start, end: range.end ?? range.start }, zone)
        : interval({ kind: 'timed', start: range.start, end: range.end }, zone),
    )
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  let end = wanted.start;
  for (const span of spans) {
    if (span.start > end) break;
    if (span.end > end) end = span.end;
    if (end >= wanted.end) return true;
  }
  return false;
};
export const calendarConstraints_check = (
  proposal: Calendar_InteractionProposal,
  range: Calendar_Selection | Calendar_EventInput<unknown>,
  input: Calendar_InteractionInput,
  excludedId?: string,
): string | undefined => {
  const settings = { ...input.constraints, ...input.views[input.view].constraints };
  const wanted = interval(range, input.timeZone);
  const dates = {
    start: range.kind === 'timed' ? range.start.withTimeZone(input.timeZone).toPlainDate() : range.start,
    end: range.kind === 'timed' ? range.end.withTimeZone(input.timeZone).toPlainDate() : (range.end ?? range.start),
  };
  if (settings.resourceIds && range.resourceIds?.some(id => !settings.resourceIds!.includes(id)))
    return 'resource-not-allowed';
  if (settings.allowedRanges) {
    const allowed =
      typeof settings.allowedRanges === 'function'
        ? settings.allowedRanges(dates, input.timeZone)
        : settings.allowedRanges;
    if (!contains(allowed, wanted, input.timeZone)) return 'outside-allowed-range';
  }
  if (
    settings.businessHours &&
    !contains(createWeeklyRanges(settings.businessHours)(dates, input.timeZone), wanted, input.timeZone)
  )
    return 'outside-business-hours';
  if (settings.resourceAvailability)
    for (const id of range.resourceIds ?? []) {
      const resource = input.resources?.find(resource => resource.id === id);
      if (!resource || !contains(resource.availability, wanted, input.timeZone)) return 'resource-unavailable';
    }
  if (
    settings.preventOverlap !== false &&
    input.events.some(event => {
      if (event['~source'] || event.id === excludedId) return false;
      if (
        range.resourceIds?.length &&
        event.resourceIds?.length &&
        !range.resourceIds.some(id => event.resourceIds!.includes(id))
      )
        return false;
      const other = interval(event, input.timeZone);
      return wanted.start < other.end && wanted.end > other.start;
    })
  )
    return 'overlap';
  const allowed = settings.allow?.(proposal, input);
  return allowed === false ? 'not-allowed' : typeof allowed === 'string' ? allowed : undefined;
};
