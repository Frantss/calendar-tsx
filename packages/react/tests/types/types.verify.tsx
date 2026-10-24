import { calendarFeatures, calendarViews } from '@calendar-tsx/core';
import { useCalendarInteractions } from '@calendar-tsx/react';
import { useSelector } from '@tanstack/react-store';
import { eventPriorityFeature } from '../../../core/tests/types/third-party/public-priority';
import type { ComponentProps } from 'react';
import { Calendar, CalendarProvider, useCalendar, useCalendarSelector } from '@calendar-tsx/react';
import type { Calendar_StateOf } from '@calendar-tsx/core';
import { listView, dayGridView, timeGridView, timelineView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import type { Calendar_Selection as Selection } from '@calendar-tsx/core';
import { dateSelectionFeature, eventMoveFeature, eventResizeFeature, interactionFeature } from '@calendar-tsx/core';

const date = Temporal.PlainDate.from('2026-10-23');
const base = { date, timeZone: 'UTC', events: [], onNavigate: () => {} };
const display = (() => {
  const registered = calendarFeatures({});
  return {
    features: registered,
    views: calendarViews({
      features: registered,
      views: {
        list: listView({ days: 1 }),
        month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
        grid: timeGridView({ days: 1 }),
        timeline: timelineView({ days: 1 }),
      },
    }),
  };
})();

export const DisplayOnlyTypingProbe = () => {
  const options = { ...base, ...display, view: 'list' as const };
  const calendar = useCalendar(options);
  // @ts-expect-error display-only calendars cannot mount pointer bindings
  useCalendarInteractions(calendar);
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

const selection = (() => {
  const registered = calendarFeatures({
    dateSelectionFeature: dateSelectionFeature(),
    interactionFeature: interactionFeature(),
  });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { grid: timeGridView({ days: 1 }) } }),
  };
})();
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

const movement = (() => {
  const registered = calendarFeatures({
    eventMoveFeature: eventMoveFeature(),
    interactionFeature: interactionFeature(),
  });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { timeline: timelineView({ days: 1 }) } }),
  };
})();
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

const resizing = (() => {
  const registered = calendarFeatures({
    eventResizeFeature: eventResizeFeature(),
    interactionFeature: interactionFeature(),
  });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { grid: timeGridView({ days: 1 }) } }),
  };
})();
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

const priorityViews = (() => {
  const registered = calendarFeatures({
    eventPriorityFeature: eventPriorityFeature({ enabled: true }),
    interactionFeature: interactionFeature(),
  });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { grid: timeGridView({ days: 1 }) } }),
  };
})();
export const PriorityOnlyTypingProbe = () => {
  const options = {
    ...base,
    ...priorityViews,
    view: 'grid' as const,
    events: [{ id: 'a', kind: 'allDay' as const, start: date, data: { title: 'Appointment', bookingId: 42 } }],
  };
  const calendar = useCalendar(options);
  const outcome = useSelector(calendar.api.interactions.store, state => state.outcome);
  const value: string | null = outcome;
  void value;
  const result = calendar.api.priority.evaluate('a', 'Customer request', { kind: 'priority', value: 'high' });
  if (result.status === 'valid') {
    const title: string = result.proposal.event.data.title;
    const bookingId: number = result.proposal.event.data.bookingId;
    void title;
    void bookingId;
    // @ts-expect-error custom operation results preserve the consumer payload
    const wrong: number = result.proposal.event.data.title;
    void wrong;
    // @ts-expect-error custom proposal does not acquire built-in edit fields
    void result.proposal.after;
  }
  // @ts-expect-error third-party registration does not imply movement
  void calendar.api.move;
  // @ts-expect-error third-party registration does not imply resizing
  void calendar.api.resize;
  // @ts-expect-error third-party registration does not imply selection
  void calendar.api.selection;
  // @ts-expect-error third-party registration does not imply selection state
  void calendar.store.state.selectedRange;
  return (
    <Calendar {...options}>
      <CalendarProvider value={calendar}>{null}</CalendarProvider>
    </Calendar>
  );
};
