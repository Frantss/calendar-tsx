import { Show, splitProps } from 'solid-js';

import type {
  Calendar_TimelineDay,
  Calendar_TimelineLayout,
  Calendar_TimelineRow,
  Calendar_TimelineSegment,
  Calendar_TimelineSlot,
  Calendar_UnavailableSegment,
} from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#calendar-factory';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#calendar-factory';
import {
  calendarParts_dateLabel,
  calendarParts_flag as flag,
  calendarParts_attributes as part,
  useCalendarParts_NavigateTrigger,
  calendarParts_vars as vars,
} from '#calendar-parts';
import { useCalendarContext } from '#use-calendar';

type Timeline<TData, TResourceData> = Calendar_TimelineLayout<TData, TResourceData>;
type Row<TData, TResourceData> = Calendar_TimelineRow<TData, TResourceData>;

type TimelineViewProps<TData, TResourceData> = { model: Timeline<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Timeline<TData, TResourceData>
>;

export const TimelineView = <TData, TResourceData>(props: TimelineViewProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'region',
          'aria-label': 'Timeline',
          style: vars({ slots: local.model.slots.length, 'min-slot-width': local.model.minSlotWidth }),
          ...part('timeline-root'),
        }),
        rest,
      )}
      state={local.model}
    />
  );
};

export const TimelineViewHeader = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('timeline-header'), props)} />
);

export const TimelineViewDayHeader = (
  props: { day: Calendar_TimelineDay } & Calendar_HTMLProps<'div', Calendar_TimelineDay>,
) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-today': flag(local.day.isToday),
          'data-date': local.day.date.toString(),
          style: vars({ 'col-start': local.day.colStart, 'col-span': local.day.colSpan }),
          ...part('timeline-day-header'),
        }),
        rest,
      )}
      state={local.day}
    />
  );
};

export const TimelineViewDayTrigger = (
  props: { day: Calendar_TimelineDay; view: string } & Calendar_HTMLProps<'button', Calendar_TimelineDay>,
) => {
  const [local, rest] = splitProps(props, ['day', 'view']);
  const context = useCalendarContext();
  const navigate = useCalendarParts_NavigateTrigger(
    () => local.view,
    () => local.day.date,
  );

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'aria-label': `Go to ${calendarParts_dateLabel(local.day.date, context.locale)}`,
          ...part('timeline-day-trigger'),
        }),
        rest,
        { onClick: navigate },
      )}
      state={local.day}
    />
  );
};

/** `slot` is the header's slot model, not the native HTML attribute. */
export const TimelineViewSlotLabel = (
  props: { slot: Calendar_TimelineSlot } & Calendar_HTMLProps<'div', Calendar_TimelineSlot>,
) => {
  const [local, rest] = splitProps(props, ['slot']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({ style: vars({ 'col-start': local.slot.col }), ...part('timeline-slot-label') }),
        rest,
      )}
      state={local.slot}
    />
  );
};

export const TimelineViewBody = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('timeline-body'), props)} />
);

type RowProps<TData, TResourceData> = { row: Row<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Row<TData, TResourceData>
>;

export const TimelineViewRow = <TData, TResourceData>(props: RowProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['row']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-unavailable': flag(local.row.isUnavailable),
          'data-resource-id': local.row.resource?.id,
          style: vars({ rows: local.row.rows }),
          ...part('timeline-row'),
        }),
        rest,
      )}
      state={local.row}
    />
  );
};

export const TimelineViewResource = <TData, TResourceData>(props: RowProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['row']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-unavailable': flag(local.row.isUnavailable),
          'data-resource-id': local.row.resource?.id,
          ...part('timeline-resource'),
        }),
        rest,
      )}
      state={local.row}
    />
  );
};

export const TimelineViewLane = <TData, TResourceData>(props: RowProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['row']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({ 'data-unavailable': flag(local.row.isUnavailable), ...part('timeline-lane') }),
        rest,
      )}
      state={local.row}
    />
  );
};

type TimelineViewEventProps<TData> = { segment: Calendar_TimelineSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_TimelineSegment<TData>
>;

export const TimelineViewEvent = <TData,>(props: TimelineViewEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'data-all-day': flag(local.segment.isAllDay),
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({ start: local.segment.start, span: local.segment.span, row: local.segment.row }),
          ...part('timeline-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

export const TimelineViewUnavailable = (
  props: { segment: Calendar_UnavailableSegment } & Calendar_HTMLProps<'div', Calendar_UnavailableSegment>,
) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          style: vars({ start: local.segment.start, span: local.segment.span }),
          ...part('timeline-unavailable'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

/** Renders only when now is inside the range (D11, D33). */
export const TimelineViewNowIndicator = <TData, TResourceData>(props: TimelineViewProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <Show when={local.model.now !== undefined}>
      <calendar.div
        {...calendarProps_merge(
          () => ({ 'aria-hidden': true, style: vars({ now: local.model.now }), ...part('timeline-now') }),
          rest,
        )}
        state={local.model}
      />
    </Show>
  );
};
