import { createCalendar, createCalendarViews, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { eventMoveFeature, interactionFeature } from './runtime';
import type { Evaluation, MoveProposal, Target } from './runtime';

declare module '@calendar-tsx/core' {
  interface Calendar_Api_FeatureMap<TData = unknown, TResourceData = unknown> {
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
