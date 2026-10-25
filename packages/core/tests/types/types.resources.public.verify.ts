import {
  createCalendar,
  calendarFeatures,
  calendarViews,
  resourceExpansionFeature,
  timelineView,
} from '@calendar-tsx/core';
import type { Calendar_ResourceExpansion, Calendar_ResourceNode } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

const features = calendarFeatures({ tree: resourceExpansionFeature({ initiallyExpanded: false }) });
const calendar = createCalendar({
  features,
  views: calendarViews({
    features,
    views: {
      timeline: timelineView({ days: 1, groupBy: 'resource', features: { tree: { initiallyExpanded: true } } }),
    },
  }),
  view: 'timeline',
  date: Temporal.PlainDate.from('2026-03-11'),
  timeZone: 'UTC',
  events: [],
  onNavigate: () => {},
  resources: [
    { id: 'child', parentId: 'parent', title: 'Room', availability: [], data: { capacity: 8 } },
    { id: 'parent', title: 'Building', availability: [], data: { capacity: 20 } },
  ],
  onResourceExpansionChange: next => {
    const state: Calendar_ResourceExpansion = next;
    void state;
  },
});
calendar.api.resourceExpansion.setExpanded('parent', true);
calendar.api.resourceExpansion.toggle('parent');
const expansion: Calendar_ResourceExpansion = calendar.store.state.resourceExpansion;
const capacity: number | undefined = calendar.store.state.layout.rows[0]?.resource?.data.capacity;
const node: Calendar_ResourceNode<{ capacity: number }> | undefined = undefined;
void [expansion, capacity, node];
// @ts-expect-error expansion takes a boolean
calendar.api.resourceExpansion.setExpanded('parent', 'yes');

const plain = createCalendar({
  features: calendarFeatures({}),
  views: calendarViews({ features: {}, views: { timeline: timelineView({ days: 1 }) } }),
  view: 'timeline',
  date: Temporal.PlainDate.from('2026-03-11'),
  timeZone: 'UTC',
  events: [],
  onNavigate: () => {},
});
// @ts-expect-error expansion actions require the expansion feature
plain.api.resourceExpansion.toggle('parent');
// @ts-expect-error expansion state requires the expansion feature
void plain.store.state.resourceExpansion;
