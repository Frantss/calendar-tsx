import { listView } from '@calendar-tsx/core';
import { scenario, resources, spanning } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Views/List' };
export const WeekAgenda = story(scenario({ view: listView({ weeks: 1 }) }));
export const MonthAgenda = story(scenario({ view: listView({ period: 'month' }) }));
export const YearAgenda = story(scenario({ view: listView({ period: 'year' }), events: spanning }));
export const EmptyAgenda = story(scenario({ view: listView({ weeks: 1 }), events: [] }));
export const MultiDayEvents = story(scenario({ view: listView({ weeks: 1 }), events: spanning }));
export const ResourcesThenDates = story(
  scenario({ view: listView({ weeks: 1, groupBy: ['resource', 'date'] }), resources }),
);
export const DatesThenResources = story(
  scenario({ view: listView({ weeks: 1, groupBy: ['date', 'resource'] }), resources }),
);
export const CustomEventOrder = story(
  scenario({ view: listView({ weeks: 1 }), eventOrder: (a, b) => b.data.title.localeCompare(a.data.title, 'en-US') }),
);
