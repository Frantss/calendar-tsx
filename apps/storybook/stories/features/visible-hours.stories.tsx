import { timeGridView, timelineView } from '@calendar-tsx/core';
import { scenario, dayWindow, overnightWindow, timed } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Visible hours' };
const overnightEvents = [
  timed('Night shift', '2026-03-11T23:00', '2026-03-12T03:00'),
  timed('Following morning', '2026-03-12T04:00', '2026-03-12T05:00'),
];
export const BusinessHoursWindow = story(scenario({ view: timeGridView({ weeks: 1, timeWindow: dayWindow }) }));
export const OvernightWindow = story(
  scenario({ view: timeGridView({ days: 1, timeWindow: overnightWindow }), events: overnightEvents }),
);
export const OffHourStart = story(
  scenario({ view: timeGridView({ days: 1, timeWindow: { startMinutes: 495, endMinutes: 675 }, slotMinutes: 30 }) }),
);
export const PartialFinalSlot = story(
  scenario({ view: timeGridView({ days: 1, timeWindow: { startMinutes: 480, endMinutes: 625 }, slotMinutes: 60 }) }),
);
export const HiddenDayWithOvernightTail = story(
  scenario({
    date: '2026-03-09',
    view: timeGridView({ days: 2, hiddenDays: [2], timeWindow: overnightWindow }),
    events: [timed('Tuesday morning on Monday', '2026-03-10T02:00', '2026-03-10T04:00')],
  }),
);
export const TimelineOvernightWindow = story(
  scenario({
    view: timelineView({ days: 1, timeWindow: overnightWindow, minSlotWidth: '4rem' }),
    events: overnightEvents,
  }),
);
export const TimelinePartialFinalSlot = story(
  scenario({
    view: timelineView({
      days: 1,
      timeWindow: { startMinutes: 495, endMinutes: 640 },
      slotMinutes: 60,
      minSlotWidth: '6rem',
    }),
  }),
);
