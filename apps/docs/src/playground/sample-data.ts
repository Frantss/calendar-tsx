import type { Calendar_EventInput, Calendar_Resource } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

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
export const sampleEvents = (anchor: Temporal.PlainDate, timeZone: string): Calendar_EventInput<Booking>[] => {
  const at = (date: Temporal.PlainDate, time: string) =>
    date.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(time) });
  const timed = (date: Temporal.PlainDate, id: string, start: string, end: string, title: string, room: string) => ({
    id: `${id}-${date.toString()}`,
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
        allDay: true,
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
