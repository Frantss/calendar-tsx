import { dayGridView } from '@calendar-tsx/core';
import { scenario, spanning } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Views/Day grid' };
export const Month = story(scenario());
export const EmptyMonth = story(scenario({ events: [] }));
export const Week = story(scenario({ view: dayGridView({ weeks: 1, maxEventsPerDay: 3 }) }));
export const RollingDays = story(scenario({ view: dayGridView({ days: 4, maxEventsPerDay: 3 }) }));
export const FixedSixWeeks = story(
  scenario({ date: '2026-02-11', view: dayGridView({ period: 'month', fixedWeekCount: true, maxEventsPerDay: 3 }) }),
);
export const QuarterByMonth = story(
  scenario({
    events: spanning,
    view: dayGridView({ period: 'quarter', groupBy: 'month', fixedWeekCount: true, maxEventsPerDay: 3 }),
  }),
);
export const YearByMonth = story(
  scenario({
    events: spanning,
    view: dayGridView({ period: 'year', groupBy: 'month', fixedWeekCount: true, maxEventsPerDay: 2 }),
  }),
);
export const ContinuousYear = story(
  scenario({ events: spanning, view: dayGridView({ period: 'year', maxEventsPerDay: 2 }) }),
);
export const SpanningEvents = story(scenario({ events: spanning }));
export const HiddenWeekdays = story(
  scenario({
    events: spanning,
    view: dayGridView({ period: 'month', hiddenDays: [6, 7], maxEventsPerDay: 3 }),
    firstDayOfWeek: 1,
  }),
);
