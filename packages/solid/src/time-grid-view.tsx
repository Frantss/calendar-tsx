import { Show, splitProps } from 'solid-js';

import type {
  Calendar_BackgroundSegment,
  Calendar_BarSegment,
  Calendar_TimeGridColumn,
  Calendar_TimeGridLayout,
  Calendar_TimeGridSegment,
  Calendar_TimeGridSlot,
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

type Grid<TData, TResourceData> = Calendar_TimeGridLayout<TData, TResourceData>;
type Column<TData, TResourceData> = Calendar_TimeGridColumn<TData, TResourceData>;

type TimeGridViewProps<TData, TResourceData> = { model: Grid<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Grid<TData, TResourceData>
>;

export const TimeGridView = <TData, TResourceData>(props: TimeGridViewProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'region',
          'aria-label': 'Time grid',
          style: vars({
            columns: local.model.columns.length,
            slots: local.model.slots.length,
            'all-day-rows': local.model.allDay?.rows,
          }),
          ...part('time-grid-root'),
        }),
        rest,
      )}
      state={local.model}
    />
  );
};

export const TimeGridViewHeader = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('time-grid-header'), props)} />
);

type ColumnProps<TData, TResourceData> = { column: Column<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Column<TData, TResourceData>
>;

export const TimeGridViewColumnHeader = <TData, TResourceData>(props: ColumnProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['column']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-today': flag(local.column.isToday),
          'data-unavailable': flag(local.column.isUnavailable),
          'data-resource-id': local.column.resource?.id,
          ...part('time-grid-column-header'),
        }),
        rest,
      )}
      state={local.column}
    />
  );
};

type TimeGridViewColumnTriggerProps<TData, TResourceData> = {
  column: Column<TData, TResourceData>;
  view: string;
} & Calendar_HTMLProps<'button', Column<TData, TResourceData>>;

export const TimeGridViewColumnTrigger = <TData, TResourceData>(
  props: TimeGridViewColumnTriggerProps<TData, TResourceData>,
) => {
  const [local, rest] = splitProps(props, ['column', 'view']);
  const context = useCalendarContext();
  const navigate = useCalendarParts_NavigateTrigger(
    () => local.view,
    () => local.column.date,
  );

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'aria-label': `Go to ${calendarParts_dateLabel(local.column.date, context.locale)}`,
          ...part('time-grid-column-trigger'),
        }),
        rest,
        { onClick: navigate },
      )}
      state={local.column}
    />
  );
};

export const TimeGridViewAllDay = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('time-grid-all-day'), props)} />
);

type TimeGridViewAllDayEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const TimeGridViewAllDayEvent = <TData,>(props: TimeGridViewAllDayEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({
            'col-start': local.segment.colStart,
            'col-span': local.segment.colSpan,
            row: local.segment.row,
          }),
          ...part('time-grid-all-day-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

export const TimeGridViewBody = <TData, TResourceData>(props: TimeGridViewProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          style: vars({ slots: local.model.slots.length, 'min-column-width': local.model.minColumnWidth }),
          ...part('time-grid-body'),
        }),
        rest,
      )}
      state={local.model}
    />
  );
};

export const TimeGridViewAxis = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('time-grid-axis'), props)} />
);

/** `slot` is the axis row's model (one time slot), not the native HTML attribute. */
export const TimeGridViewAxisLabel = (
  props: { slot: Calendar_TimeGridSlot } & Calendar_HTMLProps<'div', Calendar_TimeGridSlot>,
) => {
  const [local, rest] = splitProps(props, ['slot']);

  return <calendar.div {...calendarProps_merge(part('time-grid-axis-label'), rest)} state={local.slot} />;
};

export const TimeGridViewColumn = <TData, TResourceData>(props: ColumnProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['column']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-today': flag(local.column.isToday),
          'data-unavailable': flag(local.column.isUnavailable),
          ...part('time-grid-column'),
        }),
        rest,
      )}
      state={local.column}
    />
  );
};

export const TimeGridViewUnavailable = (
  props: { segment: Calendar_UnavailableSegment } & Calendar_HTMLProps<'div', Calendar_UnavailableSegment>,
) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          style: vars({ start: local.segment.start, span: local.segment.span }),
          ...part('time-grid-unavailable'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

/** A span a background layer shades, from `column.backgrounds` (D33). */
export const TimeGridViewBackground = (
  props: { background: Calendar_BackgroundSegment } & Calendar_HTMLProps<'div', Calendar_BackgroundSegment>,
) => {
  const [local, rest] = splitProps(props, ['background']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          'data-kind': local.background.kind,
          'data-layer': local.background.layer,
          style: vars({ start: local.background.start, span: local.background.span }),
          ...part('time-grid-background'),
        }),
        rest,
      )}
      state={local.background}
    />
  );
};

type TimeGridViewEventProps<TData> = { segment: Calendar_TimeGridSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_TimeGridSegment<TData>
>;

export const TimeGridViewEvent = <TData,>(props: TimeGridViewEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'data-overlap': flag(local.segment.lanes > 1),
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({
            start: local.segment.start,
            span: local.segment.span,
            lane: local.segment.lane,
            lanes: local.segment.lanes,
          }),
          ...part('time-grid-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

/** Renders only in today's column (D11). */
export const TimeGridViewNowIndicator = <TData, TResourceData>(props: ColumnProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['column']);

  return (
    <Show when={local.column.now !== undefined}>
      <calendar.div
        {...calendarProps_merge(
          () => ({ 'aria-hidden': true, style: vars({ now: local.column.now }), ...part('time-grid-now') }),
          rest,
        )}
        state={local.column}
      />
    </Show>
  );
};
