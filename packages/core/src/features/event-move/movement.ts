import { Temporal } from 'temporal-polyfill';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type { Calendar_MovementSettings } from '#features/event-move/event-move.types';

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
