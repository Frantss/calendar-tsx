import type { ReactElement, RefAttributes } from 'react';
import { forwardRef } from 'react';

import type {
  Calendar_BackgroundEventSegment,
  Calendar_BackgroundSegment,
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

export const TimelineView = forwardRef<HTMLDivElement, TimelineViewProps<unknown, unknown>>(
  ({ model, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          role: 'region',
          'aria-label': 'Timeline',
          style: vars({
            slots: model.slots.length,
            'slot-units': model.slotUnits,
            'slots-per-hour': 60 / model.slotMinutes,
            'hour-offset': model.hourOffset,
            days: model.days.length,
            'day-slot-units': model.slotUnits / Math.max(1, model.days.length),
            'slot-columns': model.slots.map(slot => `minmax(0, ${slot.span}fr)`).join(' ') || 'minmax(0, 1fr)',
            'min-slot-width': model.minSlotWidth,
          }),
          ...part('timeline-root'),
        },
        props,
      )}
      state={model}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: TimelineViewProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const TimelineViewHeader = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge(part('timeline-header'), props)} ref={ref} />
));

type DayProps = { day: Calendar_TimelineDay } & Calendar_HTMLProps<'div', Calendar_TimelineDay>;

export const TimelineViewDayHeader = forwardRef<HTMLDivElement, DayProps>(({ day, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'data-today': flag(day.isToday),
        'data-weekday': day.date.dayOfWeek,
        'data-date': day.date.toString(),
        style: vars({ 'col-start': day.colStart, 'col-span': day.colSpan }),
        ...part('timeline-day-header'),
      },
      props,
    )}
    state={day}
    ref={ref}
  />
));

type TimelineViewDayTriggerProps = { day: Calendar_TimelineDay; view: string } & Calendar_HTMLProps<
  'button',
  Calendar_TimelineDay
>;

export const TimelineViewDayTrigger = forwardRef<HTMLButtonElement, TimelineViewDayTriggerProps>(
  ({ day, view, ...props }, ref) => {
    const { locale } = useCalendarContext();
    const navigate = useCalendarParts_NavigateTrigger(view, day.date);

    return (
      <calendar.button
        {...calendarProps_merge(
          {
            type: 'button',
            'aria-label': `Go to ${calendarParts_dateLabel(day.date, locale)}`,
            ...part('timeline-day-trigger'),
          },
          props,
          { onClick: navigate },
        )}
        state={day}
        ref={ref}
      />
    );
  },
);

/** `slot` is the header's slot model, not the native HTML attribute. */
export const TimelineViewSlotLabel = forwardRef<
  HTMLDivElement,
  { slot: Calendar_TimelineSlot } & Calendar_HTMLProps<'div', Calendar_TimelineSlot>
>(({ slot, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      { style: vars({ 'col-start': slot.col }), 'data-day-offset': slot.dayOffset, ...part('timeline-slot-label') },
      props,
    )}
    state={slot}
    ref={ref}
  />
));

export const TimelineViewBody = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge(part('timeline-body'), props)} ref={ref} />
));

type RowProps<TData, TResourceData> = { row: Row<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Row<TData, TResourceData>
>;

export const TimelineViewRow = forwardRef<HTMLDivElement, RowProps<unknown, unknown>>(({ row, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'data-unavailable': flag(row.isUnavailable),
        'data-resource-id': row.resource?.id,
        style: vars({ rows: row.rows }),
        ...part('timeline-row'),
      },
      props,
    )}
    state={row}
    ref={ref}
  />
)) as <TData, TResourceData>(
  props: RowProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const TimelineViewResource = forwardRef<HTMLDivElement, RowProps<unknown, unknown>>(({ row, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'data-unavailable': flag(row.isUnavailable),
        'data-resource-id': row.resource?.id,
        ...part('timeline-resource'),
      },
      props,
    )}
    state={row}
    ref={ref}
  />
)) as <TData, TResourceData>(
  props: RowProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const TimelineViewLane = forwardRef<HTMLDivElement, RowProps<unknown, unknown>>(({ row, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge({ 'data-unavailable': flag(row.isUnavailable), ...part('timeline-lane') }, props)}
    state={row}
    ref={ref}
  />
)) as <TData, TResourceData>(
  props: RowProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

type TimelineViewEventProps<TData> = { segment: Calendar_TimelineSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_TimelineSegment<TData>
>;

export const TimelineViewEvent = forwardRef<HTMLButtonElement, TimelineViewEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.button
      {...calendarProps_merge(
        {
          type: 'button',
          'data-all-day': flag(segment.isAllDay),
          'data-multi-day': flag(segment.isMultiDay),
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ start: segment.start, span: segment.span, row: segment.row }),
          ...part('timeline-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: TimelineViewEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

export const TimelineViewUnavailable = forwardRef<
  HTMLDivElement,
  { segment: Calendar_UnavailableSegment } & Calendar_HTMLProps<'div', Calendar_UnavailableSegment>
>(({ segment, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'aria-hidden': true,
        style: vars({ start: segment.start, span: segment.span }),
        ...part('timeline-unavailable'),
      },
      props,
    )}
    state={segment}
    ref={ref}
  />
));

export const TimelineViewBackground = forwardRef<
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
        ...part('timeline-background'),
      },
      props,
    )}
    state={background}
    ref={ref}
  />
));

type TimelineViewBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSegment<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSegment<TData>
>;

export const TimelineViewBackgroundEvent = forwardRef<HTMLDivElement, TimelineViewBackgroundEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          'aria-hidden': true,
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ start: segment.start, span: segment.span }),
          ...part('timeline-background-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: TimelineViewBackgroundEventProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

/** Renders only when now is inside the range (D11, D34). */
export const TimelineViewNowIndicator = forwardRef<HTMLDivElement, TimelineViewProps<unknown, unknown>>(
  ({ model, ...props }, ref) => {
    if (model.now === undefined) return null;

    return (
      <calendar.div
        {...calendarProps_merge(
          { 'aria-hidden': true, style: vars({ now: model.now }), ...part('timeline-now') },
          props,
        )}
        state={model}
        ref={ref}
      />
    );
  },
) as <TData, TResourceData>(
  props: TimelineViewProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;
