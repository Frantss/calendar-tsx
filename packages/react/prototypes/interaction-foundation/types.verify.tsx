import type { ComponentProps } from 'react';
import { Calendar, CalendarProvider, useCalendar, useCalendarSelector } from '@calendar-tsx/react';
import type { Calendar_StateOf } from '@calendar-tsx/core';
import { createCalendarViews, listView, monthView, timeGridView, timelineView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import type { Selection } from '../../../core/prototypes/interaction-foundation/runtime';
import {
  dateSelectionFeature,
  eventMoveFeature,
  eventResizeFeature,
  interactionFeature,
} from '../../../core/prototypes/interaction-foundation/runtime';
import type {} from '../../../core/prototypes/interaction-foundation/feature-types';

const date = Temporal.PlainDate.from('2026-10-23');
const base = { date, timeZone: 'UTC', events: [], onNavigate: () => {} };
const display = createCalendarViews({
  list: listView({ days: 1 }),
  month: monthView({ maxEventsPerDay: 3 }),
  grid: timeGridView({ days: 1 }),
  timeline: timelineView({ days: 1 }),
});

export const DisplayOnlyTypingProbe = () => {
  const options = { ...base, ...display, view: 'list' as const };
  const calendar = useCalendar(options);
  const props: ComponentProps<typeof CalendarProvider> = { value: calendar, children: null };
  const view = useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => {
    // @ts-expect-error importing selection declarations must not add unregistered state
    void state.selectedRange;
    return state.context.view;
  });
  void view;
  // @ts-expect-error selection remains absent from the inferred instance API
  void calendar.api.selection;
  // @ts-expect-error provider erasure must not widen the original instance's view keys
  calendar.api.setView('missing');
  return (
    <Calendar {...options}>
      <CalendarProvider {...props} />
    </Calendar>
  );
};

const selection = createCalendarViews({
  grid: timeGridView({ days: 1, features: { dateSelectionFeature, interactionFeature } }),
});
export const SelectionTypingProbe = () => {
  const options = { ...base, ...selection, view: 'grid' as const, state: { selectedRange: null } };
  const calendar = useCalendar(options);
  const selected = useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => state.selectedRange);
  const range: Selection | null = selected;
  void range;
  calendar.api.selection.begin({ kind: 'timed', at: date.toZonedDateTime('UTC') });
  // @ts-expect-error selector inference must retain the selection type
  const wrong: number = selected;
  void wrong;
  // @ts-expect-error movement remains absent from a selection-only calendar
  void calendar.api.move;
  return (
    <Calendar {...options}>
      <CalendarProvider value={calendar}>{null}</CalendarProvider>
    </Calendar>
  );
};

const movement = createCalendarViews({
  timeline: timelineView({ days: 1, features: { eventMoveFeature, interactionFeature } }),
});
export const MovementOnlyTypingProbe = () => {
  const options = {
    ...base,
    ...movement,
    view: 'timeline' as const,
    events: [
      { id: 'appointment', kind: 'allDay' as const, start: date, data: { title: 'Appointment', bookingId: 42 } },
    ],
  };
  const calendar = useCalendar(options);
  calendar.api.move.begin('appointment');
  const result = calendar.api.move.evaluate('appointment', { kind: 'allDay', at: date.add({ days: 1 }) });
  if (result.status === 'valid') {
    const before: string = result.proposal.before.data.title;
    const after: number = result.proposal.after.data.bookingId;
    void before;
    void after;
    // @ts-expect-error movement results retain the inferred payload type
    const wrong: number = result.proposal.after.data.title;
    void wrong;
    // @ts-expect-error movement does not fabricate payload fields
    void result.proposal.before.data.missing;
  }

  // @ts-expect-error movement does not imply selection state
  void calendar.store.state.selectedRange;
  // @ts-expect-error movement does not imply a selection API
  void calendar.api.selection;
  return (
    <Calendar {...options}>
      <CalendarProvider value={calendar}>{null}</CalendarProvider>
    </Calendar>
  );
};

const resizing = createCalendarViews({
  grid: timeGridView({ days: 1, features: { eventResizeFeature, interactionFeature } }),
});
export const ResizeOnlyTypingProbe = () => {
  const options = {
    ...base,
    ...resizing,
    view: 'grid' as const,
    events: [{ id: 'appointment', kind: 'allDay' as const, start: date, data: { title: 'Appointment' } }],
  };
  const calendar = useCalendar(options);
  const result = calendar.api.resize.evaluate('appointment', 'end', { kind: 'allDay', at: date });
  if (result.status === 'valid') {
    const title: string = result.proposal.after.data.title;
    void title;
    // @ts-expect-error resize results retain event payloads
    const wrong: number = result.proposal.before.data.title;
    void wrong;
  }
  // @ts-expect-error resizing must not expose movement
  void calendar.api.move;
  // @ts-expect-error resizing must not expose selection
  void calendar.api.selection;
  // @ts-expect-error resizing must not register selection state
  void calendar.store.state.selectedRange;
  return (
    <Calendar {...options}>
      <CalendarProvider value={calendar}>{null}</CalendarProvider>
    </Calendar>
  );
};
