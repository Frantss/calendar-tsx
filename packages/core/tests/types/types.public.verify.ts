import { calendarFeatures, calendarViews } from '@calendar-tsx/core';
import './types.dom.public.verify';
import { createCalendar, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { eventMoveFeature, eventResizeFeature, interactionFeature } from '@calendar-tsx/core';

const date = Temporal.PlainDate.from('2026-10-23');
const enabled: boolean = Boolean(Date.now());
const conditionalFeatures = calendarFeatures({
  interactionFeature: interactionFeature(),
  ...(enabled ? { eventMoveFeature: eventMoveFeature() } : {}),
});
createCalendar({
  features: conditionalFeatures,
  views: calendarViews({ features: conditionalFeatures, views: { day: timeGridView({ days: 1 }) } }),
  view: 'day',
  date,
  timeZone: 'UTC',
  events: [],
  onNavigate: () => {},
});
const views = (() => {
  const registered = calendarFeatures({
    eventMoveFeature: eventMoveFeature(),
    interactionFeature: interactionFeature(),
  });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { grid: timeGridView({ days: 1 }) } }),
  };
})();
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

const resizeViews = (() => {
  const registered = calendarFeatures({
    eventResizeFeature: eventResizeFeature(),
    interactionFeature: interactionFeature(),
  });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { grid: timeGridView({ days: 1 }) } }),
  };
})();
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

import { approvalFeature } from './third-party/public-feature';
const approvalViews = (() => {
  const registered = calendarFeatures({ approvalFeature, interactionFeature: interactionFeature() });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { grid: timeGridView({ days: 1 }) } }),
  };
})();
const approved = createCalendar({
  ...approvalViews,
  date,
  timeZone: 'UTC',
  view: 'grid',
  events: calendar.options.events,
  onNavigate: () => {},
  onApproval: proposal => {
    const bookingId: number = proposal.event.data.bookingId;
    void bookingId;
    // @ts-expect-error a public third-party callback preserves consumer payloads
    void proposal.event.data.missing;
  },
});
const approval = approved.api.approval.evaluate('appointment', false);
if (approval.status === 'valid') {
  const title: string = approval.proposal.event.data.title;
  void title;
  // @ts-expect-error a public third-party result preserves consumer payloads
  const wrong: number = approval.proposal.event.data.title;
  void wrong;
}
// @ts-expect-error the extension owns a boolean target
approved.api.approval.evaluate('appointment', { kind: 'allDay', at: date });
// @ts-expect-error approval does not install date selection
void approved.api.selection;

import { approvalBoardView } from './third-party/public-layout';
const boardViews = (() => {
  const registered = calendarFeatures({ approvalFeature, interactionFeature: interactionFeature() });
  return { features: registered, views: calendarViews({ features: registered, views: { board: approvalBoardView } }) };
})();
const board = createCalendar({
  ...boardViews,
  date,
  timeZone: 'UTC',
  events: calendar.options.events,
  view: 'board',
  onNavigate: () => {},
});
const cell = board.api.interactions.locate({ kind: 'approvalBoard', cell: 0 });
if (cell.status === 'valid') {
  const accepted: boolean = cell.target;
  void accepted;
  // @ts-expect-error a custom layout retains its target type
  const wrong: string = cell.target;
  void wrong;
}
// @ts-expect-error a custom layout retains its point type
board.api.interactions.locate({ kind: 'approvalBoard', cell: 'wrong' });
const preview = board.api.interactions.store.state.preview;
if (preview?.status === 'valid' && preview.kind === 'approvalBoard') {
  const eventId: string = preview.geometry.eventId;
  void eventId;
  // @ts-expect-error custom geometry is discriminated by the layout kind
  void preview.geometry.start;
}
const located = calendar.api.interactions.locate({
  kind: 'timeGrid',
  surface: { kind: 'column', key: 'all:2026-10-23' },
  fraction: 0.5,
});
if (located.status === 'valid') {
  const kind: 'timed' | 'allDay' = located.target.kind;
  void kind;
}
// @ts-expect-error builtin layout points reject an invalid surface
calendar.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'lane', key: 'all' }, fraction: 0 });

import { createCalendarDomOperation } from '@calendar-tsx/core';
const startedApproval = approved.api.approval.begin('appointment');
if (startedApproval.status === 'active') {
  startedApproval.session.update(true);
  // @ts-expect-error boolean operations reject date targets after begin
  startedApproval.session.update({ kind: 'allDay', at: date });
  const result = startedApproval.session.commit();
  if (result.status === 'committed') {
    const bookingId: number = result.proposal.event.data.bookingId;
    void bookingId;
    // @ts-expect-error session commit preserves event data
    void result.proposal.event.data.missing;
  }
}
createCalendarDomOperation<'approve'>({
  acceptsTarget: (target): target is boolean => typeof target === 'boolean',
  begin: () => approved.api.approval.begin('appointment'),
  // @ts-expect-error a DOM binding must produce its operation's target
  target: () => ({ kind: 'allDay', at: date }),
});
// @ts-expect-error the typed descriptor does not expose erased runtime binding
void approvalFeature.interaction.operation.bind;
