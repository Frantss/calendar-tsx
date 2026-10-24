import { eventPriorityFeature, type PriorityApi } from './third-party/priority';
import { createCalendar, createCalendarViews, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { eventMoveFeature, eventResizeFeature, interactionFeature } from './operations';
import type { Evaluation, MoveProposal, ResizeProposal, Target } from './operations';

declare module '@calendar-tsx/core' {
  interface Calendar_State_FeatureMap {
    dateSelectionFeature: { selectedRange: unknown };
  }
  interface Calendar_Api_FeatureMap<TData = unknown, TResourceData = unknown> {
    dateSelectionFeature: { selection: { begin: () => void } };
    eventResizeFeature: {
      resize: {
        evaluate: (eventId: string, edge: 'start' | 'end', target: Target) => Evaluation<ResizeProposal<TData>>;
      };
    };
    eventMoveFeature: {
      move: { evaluate: (eventId: string, target: Target) => Evaluation<MoveProposal<TData>> };
    };
  }
}

const date = Temporal.PlainDate.from('2026-10-23');
const views = createCalendarViews({
  grid: timeGridView({ days: 1, features: { eventMoveFeature, interactionFeature } }),
});
const calendar = createCalendar({
  ...views,
  view: 'grid',
  date,
  timeZone: 'UTC',
  events: [{ id: 'appointment', kind: 'allDay', start: date, data: { title: 'Appointment', bookingId: 42 } }],
  onNavigate: () => {},
});
const result = calendar.api.move.evaluate('appointment', { kind: 'allDay', at: date.add({ days: 1 }) });
if (result.status === 'valid') {
  const before: string = result.proposal.before.data.title;
  const after: number = result.proposal.after.data.bookingId;
  void before;
  void after;
  // @ts-expect-error built declarations must retain the inferred event payload
  const wrong: number = result.proposal.after.data.title;
  void wrong;
  // @ts-expect-error built declarations must reject absent payload fields
  void result.proposal.before.data.missing;
}

const resizeViews = createCalendarViews({
  grid: timeGridView({ days: 1, features: { eventResizeFeature, interactionFeature } }),
});
const resizeCalendar = createCalendar({
  ...resizeViews,
  date,
  timeZone: 'UTC',
  view: 'grid',
  events: calendar.options.events,
  onNavigate: () => {},
});
const resized = resizeCalendar.api.resize.evaluate('appointment', 'end', { kind: 'allDay', at: date });
if (resized.status === 'valid') {
  const title: string = resized.proposal.after.data.title;
  void title;
  // @ts-expect-error built resize results preserve payloads
  const wrong: number = resized.proposal.before.data.title;
  void wrong;
}
// @ts-expect-error resize-only public declarations omit movement
void resizeCalendar.api.move;
// @ts-expect-error resize-only public declarations omit selection
void resizeCalendar.api.selection;
// @ts-expect-error resize-only public declarations omit selection state
void resizeCalendar.store.state.selectedRange;

declare module '@calendar-tsx/core' {
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    eventPriorityFeature: { priority: PriorityApi<TData> };
  }
}
const priorityViews = createCalendarViews({
  grid: timeGridView({ days: 1, features: { interactionFeature, eventPriorityFeature } }),
});
const priorityCalendar = createCalendar({
  ...priorityViews,
  date,
  timeZone: 'UTC',
  view: 'grid',
  events: calendar.options.events,
  onNavigate: () => {},
});
const priorityResult = priorityCalendar.api.priority.evaluate('appointment', 'Customer request', {
  kind: 'priority',
  value: 'high',
});
if (priorityResult.status === 'valid') {
  const title: string = priorityResult.proposal.event.data.title;
  void title;
  // @ts-expect-error built feature API retains the extension's payload type
  const wrong: number = priorityResult.proposal.event.data.title;
  void wrong;
}
// @ts-expect-error custom operation does not register resizing
void priorityCalendar.api.resize;
