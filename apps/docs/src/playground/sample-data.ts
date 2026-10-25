import type { Calendar_EventInput, Calendar_Resource } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import type { PlaygroundDataSet, PlaygroundEvent } from './config';

export type Booking = { title: string };
export type Room = { capacity: number };

/** Days around the month of `anchor`, wide enough for its padded weeks and the week views at either edge. */
const sampleDays = (anchor: Temporal.PlainDate) => {
  const start = anchor.with({ day: 1 }).subtract({ days: 7 });

  return Array.from({ length: 50 }, (_, index) => start.add({ days: index }));
};

const isWeekday = (date: Temporal.PlainDate) => date.dayOfWeek <= 5;

/**
 * A repeating sample week, generated around `anchor` so every view has something to show. It includes overlapping
 * meetings (lanes), an event across midnight, a multi-day all-day event and one busy day (month overflow).
 */
const sampleEvents = (anchor: Temporal.PlainDate, timeZone: string): Calendar_EventInput<Booking>[] => {
  const at = (date: Temporal.PlainDate, time: string) =>
    date.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(time) });
  const timed = (date: Temporal.PlainDate, id: string, start: string, end: string, title: string, room: string) => ({
    id: `${id}-${date.toString()}`,
    kind: 'timed' as const,
    start: at(date, start),
    end: at(end < start ? date.add({ days: 1 }) : date, end),
    resourceIds: [room],
    data: { title },
  });

  return sampleDays(anchor).flatMap((date): Calendar_EventInput<Booking>[] => {
    const events: Calendar_EventInput<Booking>[] = [];

    if (isWeekday(date)) events.push(timed(date, 'standup', '09:00', '09:15', 'Standup', 'room-a'));
    if (date.dayOfWeek === 2 || date.dayOfWeek === 4)
      events.push(timed(date, 'review', '10:00', '11:00', 'Design review', 'room-b'));
    if (date.dayOfWeek === 2) events.push(timed(date, 'one-on-one', '10:30', '11:30', 'One-on-one', 'room-a'));
    if (date.dayOfWeek === 3) events.push(timed(date, 'lunch', '12:00', '13:00', 'Lunch and learn', 'room-c'));
    if (date.dayOfWeek === 4) events.push(timed(date, 'deploy', '22:00', '01:00', 'Deploy window', 'room-a'));
    if (date.dayOfWeek === 5) events.push(timed(date, 'release', '16:00', '17:30', 'Release', 'room-b'));

    if (date.day === 12) {
      events.push({
        id: `offsite-${date.toString()}`,
        kind: 'allDay',
        start: date,
        end: date.add({ days: 1 }),
        data: { title: 'Team offsite' },
      });
    }

    if (date.day === 20) {
      for (const [index, title] of ['Planning', 'Interviews', 'Budget sync', 'Demo prep', 'Retro'].entries())
        events.push(timed(date, `busy-${index}`, `${13 + index}:00`, `${13 + index}:45`, title, 'room-c'));
    }

    return events;
  });
};

/** On top of the sample week: crowded mornings for lanes, a weekly on-call bar, and more events per day than fit. */
const busyEvents = (anchor: Temporal.PlainDate, timeZone: string): Calendar_EventInput<Booking>[] => {
  const at = (date: Temporal.PlainDate, time: string) =>
    date.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(time) });
  const meetings = [
    ['triage', '10:00', '11:00', 'Bug triage', 'room-a'],
    ['interview', '10:30', '11:30', 'Interview', 'room-b'],
    ['sync', '10:45', '12:00', 'Partner sync', 'room-c'],
    ['focus', '14:00', '16:00', 'Focus time', 'room-c'],
  ] as const;

  return sampleDays(anchor).flatMap((date): Calendar_EventInput<Booking>[] => [
    ...(isWeekday(date)
      ? meetings.map(([id, start, end, title, room]) => ({
          id: `${id}-${date.toString()}`,
          kind: 'timed' as const,
          start: at(date, start),
          end: at(date, end),
          resourceIds: [room],
          data: { title },
        }))
      : []),
    ...(date.dayOfWeek === 1
      ? [
          {
            id: `on-call-${date.toString()}`,
            kind: 'allDay' as const,
            start: date,
            end: date.add({ days: 4 }),
            data: { title: 'On call' },
          },
        ]
      : []),
  ]);
};

const nestedEvents = (anchor: Temporal.PlainDate, timeZone: string): Calendar_EventInput<Booking>[] => {
  const bookings = [
    ['office-briefing', 'Office briefing', '08:30', '09:00', 'office'],
    ['planning', 'Planning', '09:00', '10:00', 'room-a'],
    ['review', 'Design review', '10:30', '11:30', 'room-b'],
    ['workshop', 'Workshop', '13:00', '15:00', 'room-c'],
  ] as const;
  return sampleDays(anchor).flatMap(date =>
    bookings.map(([id, title, start, end, resource]) => ({
      id: `${id}-${date.toString()}`,
      kind: 'timed' as const,
      start: date.toZonedDateTime({ timeZone, plainTime: start }),
      end: date.toZonedDateTime({ timeZone, plainTime: end }),
      resourceIds: [resource],
      data: { title },
    })),
  );
};

/** The events added in the playground, as calendar input in `timeZone`. */
export const playgroundEvents = (events: PlaygroundEvent[], timeZone: string): Calendar_EventInput<Booking>[] =>
  events.map(event => {
    const date = Temporal.PlainDate.from(event.date);
    const resourceIds = event.room ? [event.room] : undefined;

    if (event.allDay) {
      return {
        id: event.id,
        kind: 'allDay',
        start: date,
        end: date.add({ days: event.days - 1 }),
        resourceIds,
        data: { title: event.title },
      };
    }

    const start = date.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(event.start) });
    const endDate = event.end <= event.start ? date.add({ days: 1 }) : date;

    return {
      id: event.id,
      kind: 'timed',
      start,
      end: endDate.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(event.end) }),
      resourceIds,
      data: { title: event.title },
    };
  });

/** The generated events of a data set, around the month of `anchor`. */
export const dataSetEvents = (set: PlaygroundDataSet, anchor: Temporal.PlainDate, timeZone: string) =>
  set === 'empty'
    ? []
    : set === 'nested'
      ? nestedEvents(anchor, timeZone)
      : set === 'busy'
        ? [...sampleEvents(anchor, timeZone), ...busyEvents(anchor, timeZone)]
        : sampleEvents(anchor, timeZone);

/** Three rooms: A open on weekdays, B closed over lunch, C closed on Mondays. */
export const sampleRooms = (anchor: Temporal.PlainDate, timeZone: string): Calendar_Resource<Room>[] => {
  const days = sampleDays(anchor);
  const open = (date: Temporal.PlainDate, start: string, end: string) => ({
    start: date.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(start) }),
    end: date.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(end) }),
  });

  return [
    {
      id: 'room-a',
      title: 'Room A',
      availability: days.filter(isWeekday).map(date => open(date, '08:00', '18:00')),
      data: { capacity: 8 },
    },
    {
      id: 'room-b',
      title: 'Room B',
      availability: days
        .filter(isWeekday)
        .flatMap(date => [open(date, '09:00', '12:00'), open(date, '13:00', '17:00')]),
      data: { capacity: 4 },
    },
    {
      id: 'room-c',
      title: 'Room C',
      availability: days.filter(date => date.dayOfWeek !== 1).map(date => open(date, '07:00', '21:00')),
      data: { capacity: 12 },
    },
  ];
};

export const dataSetResources = (
  set: PlaygroundDataSet,
  anchor: Temporal.PlainDate,
  timeZone: string,
): Calendar_Resource<Room>[] => {
  const rooms = sampleRooms(anchor, timeZone);
  if (set !== 'nested') return rooms;
  return [
    { id: 'office', title: 'Main office', availability: rooms[2]!.availability, data: { capacity: 24 } },
    {
      id: 'floor-1',
      title: 'First floor',
      parentId: 'office',
      availability: rooms[0]!.availability,
      data: { capacity: 12 },
    },
    { ...rooms[0]!, parentId: 'floor-1' },
    { ...rooms[1]!, parentId: 'floor-1' },
    {
      id: 'floor-2',
      title: 'Second floor',
      parentId: 'office',
      availability: rooms[2]!.availability,
      data: { capacity: 12 },
    },
    { ...rooms[2]!, parentId: 'floor-2' },
  ];
};
