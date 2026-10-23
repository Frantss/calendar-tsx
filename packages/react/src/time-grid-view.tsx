import type { ReactElement, RefAttributes } from 'react';
import { forwardRef } from 'react';

import type {
  Calendar_BackgroundSegment,
  Calendar_BackgroundEventSegment,
  Calendar_BackgroundEventSpan,
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

export const TimeGridView = forwardRef<HTMLDivElement, TimeGridViewProps<unknown, unknown>>(
  ({ model, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          role: 'region',
          'aria-label': 'Time grid',
          style: vars({ columns: model.columns.length, slots: model.slots.length, 'all-day-rows': model.allDay?.rows }),
          ...part('time-grid-root'),
        },
        props,
      )}
      state={model}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: TimeGridViewProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const TimeGridViewHeader = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge(part('time-grid-header'), props)} ref={ref} />
));

type ColumnProps<TData, TResourceData> = { column: Column<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Column<TData, TResourceData>
>;

export const TimeGridViewColumnHeader = forwardRef<HTMLDivElement, ColumnProps<unknown, unknown>>(
  ({ column, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          'data-today': flag(column.isToday),
          'data-unavailable': flag(column.isUnavailable),
          'data-resource-id': column.resource?.id,
          ...part('time-grid-column-header'),
        },
        props,
      )}
      state={column}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: ColumnProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

type TimeGridViewColumnTriggerProps<TData, TResourceData> = {
  column: Column<TData, TResourceData>;
  view: string;
} & Calendar_HTMLProps<'button', Column<TData, TResourceData>>;

export const TimeGridViewColumnTrigger = forwardRef<
  HTMLButtonElement,
  TimeGridViewColumnTriggerProps<unknown, unknown>
>(({ column, view, ...props }, ref) => {
  const { locale } = useCalendarContext();
  const navigate = useCalendarParts_NavigateTrigger(view, column.date);

  return (
    <calendar.button
      {...calendarProps_merge(
        {
          type: 'button',
          'aria-label': `Go to ${calendarParts_dateLabel(column.date, locale)}`,
          ...part('time-grid-column-trigger'),
        },
        props,
        { onClick: navigate },
      )}
      state={column}
      ref={ref}
    />
  );
}) as <TData, TResourceData>(
  props: TimeGridViewColumnTriggerProps<TData, TResourceData> & RefAttributes<HTMLButtonElement>,
) => ReactElement | null;

export const TimeGridViewAllDay = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge(part('time-grid-all-day'), props)} ref={ref} />
));

type TimeGridViewAllDayEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const TimeGridViewAllDayEvent = forwardRef<HTMLButtonElement, TimeGridViewAllDayEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.button
      {...calendarProps_merge(
        {
          type: 'button',
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan, row: segment.row }),
          ...part('time-grid-all-day-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: TimeGridViewAllDayEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

type TimeGridViewAllDayBackgroundEventProps<TData> = {
  segment: Calendar_BackgroundEventSpan<TData>;
} & Calendar_HTMLProps<'div', Calendar_BackgroundEventSpan<TData>>;

/** An all-day background event across the all-day row, under the bars; not interactive (D37). */
export const TimeGridViewAllDayBackgroundEvent = forwardRef<
  HTMLDivElement,
  TimeGridViewAllDayBackgroundEventProps<unknown>
>(({ segment, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'aria-hidden': true,
        'data-continues-before': flag(segment.continuesBefore),
        'data-continues-after': flag(segment.continuesAfter),
        style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan }),
        ...part('time-grid-all-day-background-event'),
      },
      props,
    )}
    state={segment}
    ref={ref}
  />
)) as <TData>(
  props: TimeGridViewAllDayBackgroundEventProps<TData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const TimeGridViewBody = forwardRef<HTMLDivElement, TimeGridViewProps<unknown, unknown>>(
  ({ model, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          style: vars({ slots: model.slots.length, 'min-column-width': model.minColumnWidth }),
          ...part('time-grid-body'),
        },
        props,
      )}
      state={model}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: TimeGridViewProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const TimeGridViewAxis = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge(part('time-grid-axis'), props)} ref={ref} />
));

/** `slot` is the axis row's model (one time slot), not the native HTML attribute. */
export const TimeGridViewAxisLabel = forwardRef<
  HTMLDivElement,
  { slot: Calendar_TimeGridSlot } & Calendar_HTMLProps<'div', Calendar_TimeGridSlot>
>(({ slot, ...props }, ref) => (
  <calendar.div {...calendarProps_merge(part('time-grid-axis-label'), props)} state={slot} ref={ref} />
));

export const TimeGridViewColumn = forwardRef<HTMLDivElement, ColumnProps<unknown, unknown>>(
  ({ column, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          'data-today': flag(column.isToday),
          'data-unavailable': flag(column.isUnavailable),
          style: vars({ 'column-lanes': column.lanes }),
          ...part('time-grid-column'),
        },
        props,
      )}
      state={column}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: ColumnProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const TimeGridViewUnavailable = forwardRef<
  HTMLDivElement,
  { segment: Calendar_UnavailableSegment } & Calendar_HTMLProps<'div', Calendar_UnavailableSegment>
>(({ segment, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'aria-hidden': true,
        style: vars({ start: segment.start, span: segment.span }),
        ...part('time-grid-unavailable'),
      },
      props,
    )}
    state={segment}
    ref={ref}
  />
));

/** A span a background layer shades, from `column.backgrounds` (D33). */
export const TimeGridViewBackground = forwardRef<
  HTMLDivElement,
  { background: Calendar_BackgroundSegment } & Calendar_HTMLProps<'div', Calendar_BackgroundSegment>
>(({ background, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'aria-hidden': true,
        'data-kind': background.kind,
        'data-layer': background.layer,
        style: vars({ start: background.start, span: background.span }),
        ...part('time-grid-background'),
      },
      props,
    )}
    state={background}
    ref={ref}
  />
));

type TimeGridViewBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSegment<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSegment<TData>
>;

/** A background event in a column, under the events; not interactive (D37). */
export const TimeGridViewBackgroundEvent = forwardRef<HTMLDivElement, TimeGridViewBackgroundEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          'aria-hidden': true,
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ start: segment.start, span: segment.span }),
          ...part('time-grid-background-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: TimeGridViewBackgroundEventProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type TimeGridViewEventProps<TData> = { segment: Calendar_TimeGridSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_TimeGridSegment<TData>
>;

export const TimeGridViewEvent = forwardRef<HTMLButtonElement, TimeGridViewEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.button
      {...calendarProps_merge(
        {
          type: 'button',
          'data-overlap': flag(segment.lanes > 1),
          'data-short': flag(segment.isShort),
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({
            start: segment.start,
            span: segment.span,
            lane: segment.lane,
            lanes: segment.lanes,
            'inline-start': segment.inlineStart,
            'inline-size': segment.inlineSize,
          }),
          ...part('time-grid-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: TimeGridViewEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

/** Renders only in today's column (D11). */
export const TimeGridViewNowIndicator = forwardRef<HTMLDivElement, ColumnProps<unknown, unknown>>(
  ({ column, ...props }, ref) => {
    if (column.now === undefined) return null;

    return (
      <calendar.div
        {...calendarProps_merge(
          { 'aria-hidden': true, style: vars({ now: column.now }), ...part('time-grid-now') },
          props,
        )}
        state={column}
        ref={ref}
      />
    );
  },
) as <TData, TResourceData>(
  props: ColumnProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;
