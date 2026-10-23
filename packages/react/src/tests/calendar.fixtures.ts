import { Temporal } from 'temporal-polyfill';

import type { Calendar_AllDayEventInput, Calendar_Resource, Calendar_TimedEventInput } from '@calendar-tsx/core';

export type Fixtures_EventData = { title: string };

export const fixtures_timeZone = 'America/New_York';

export const fixtures_at = (date: string, time: string, timeZone = fixtures_timeZone) =>
  Temporal.ZonedDateTime.from(`${date}T${time}[${timeZone}]`);

export const fixtures_timed = (
  id: string,
  {
    date,
    start,
    end,
    endDate = date,
    resourceIds,
  }: { date: string; start: string; end: string; endDate?: string; resourceIds?: string[] },
): Calendar_TimedEventInput<Fixtures_EventData> => ({
  id,
  kind: 'timed',
  start: fixtures_at(date, start),
  end: fixtures_at(endDate, end),
  resourceIds,
  data: { title: id },
});

export const fixtures_allDay = (
  id: string,
  { start, end, resourceIds }: { start: string; end?: string; resourceIds?: string[] },
): Calendar_AllDayEventInput<Fixtures_EventData> => ({
  id,
  kind: 'allDay',
  start: Temporal.PlainDate.from(start),
  end: end ? Temporal.PlainDate.from(end) : undefined,
  resourceIds,
  data: { title: id },
});

export const fixtures_resource = (
  id: string,
  availability: { date: string; start: string; end: string; endDate?: string }[] = [],
): Calendar_Resource<null> => ({
  id,
  title: id,
  availability: availability.map(period => ({
    start: fixtures_at(period.date, period.start),
    end: fixtures_at(period.endDate ?? period.date, period.end),
  })),
  data: null,
});
