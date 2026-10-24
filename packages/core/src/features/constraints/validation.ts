import { createWeeklyRanges } from '#features/background/background-ranges';
import type { Calendar_BackgroundRange } from '#features/background/background.types';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_InteractionInput, Calendar_InteractionProposal } from '#features/interaction/interaction.types';
import type { Calendar_Selection } from '#features/date-selection/date-selection.types';

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
