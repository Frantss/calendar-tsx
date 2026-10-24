import { timeGridView } from '@calendar-tsx/core';
import { scenario, brief, overlaps, dayWindow, spanning } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Views/Time grid' };
const day = timeGridView({ days: 1, timeWindow: dayWindow });
export const Day = story(scenario({ view: day }));
export const Week = story(scenario({ view: timeGridView({ weeks: 1, timeWindow: dayWindow }) }));
export const Workweek = story(
  scenario({ view: timeGridView({ weeks: 1, hiddenDays: [6, 7], timeWindow: dayWindow }), firstDayOfWeek: 1 }),
);
export const EmptyWeek = story(scenario({ events: [], view: timeGridView({ weeks: 1, timeWindow: dayWindow }) }));
export const AllDayRow = story(scenario({ view: timeGridView({ weeks: 1, timeWindow: dayWindow, allDay: true }) }));
export const SideBySideOverlap = story(scenario({ events: overlaps, view: day }));
export const CascadeOverlap = story(
  scenario({ events: overlaps, view: timeGridView({ days: 1, timeWindow: dayWindow, overlap: 'cascade' }) }),
);
export const LaneExpansion = story(scenario({ events: overlaps.slice(0, 4), view: day }));
export const ShortEvents = story(scenario({ events: brief, view: day }));
export const ExactEventDurations = story(
  scenario({ events: brief, view: timeGridView({ days: 1, timeWindow: dayWindow, minEventMinutes: 0 }) }),
);
export const ClippedEvents = story(
  scenario({ events: spanning, view: timeGridView({ days: 2, timeWindow: { startMinutes: 60, endMinutes: 1380 } }) }),
);
