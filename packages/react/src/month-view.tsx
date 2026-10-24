import type { ReactElement, RefAttributes } from 'react';
import { forwardRef } from 'react';
import type { Temporal } from 'temporal-polyfill';

import type {
  Calendar_BackgroundEventSpan,
  Calendar_BarSegment,
  Calendar_DayBackground,
  Calendar_MonthDay,
  Calendar_MonthLayout,
  Calendar_MonthWeek,
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

type MonthViewProps<TData> = { model: Calendar_MonthLayout<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_MonthLayout<TData>
>;

export const MonthView = forwardRef<HTMLDivElement, MonthViewProps<unknown>>(({ model, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      { role: 'grid', style: vars({ columns: model.weekdays.length }), ...part('month-root') },
      props,
    )}
    state={model}
    ref={ref}
  />
)) as <TData>(props: MonthViewProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

export const MonthViewHeader = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge({ role: 'row', ...part('month-header') }, props)} ref={ref} />
));

export const MonthViewHeaderCell = forwardRef<
  HTMLDivElement,
  { weekday: Temporal.PlainDate } & Calendar_HTMLProps<'div', Temporal.PlainDate>
>(({ weekday, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      { role: 'columnheader', 'data-weekday': weekday.dayOfWeek, ...part('month-header-cell') },
      props,
    )}
    state={weekday}
    ref={ref}
  />
));

type MonthViewWeekProps<TData> = { week: Calendar_MonthWeek<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_MonthWeek<TData>
>;

export const MonthViewWeek = forwardRef<HTMLDivElement, MonthViewWeekProps<unknown>>(({ week, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      { role: 'row', style: vars({ rows: week.rows, columns: week.days.length }), ...part('month-week') },
      props,
    )}
    state={week}
    ref={ref}
  />
)) as <TData>(props: MonthViewWeekProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type MonthViewDayProps<TData> = { day: Calendar_MonthDay<TData> } & Calendar_HTMLProps<'div', Calendar_MonthDay<TData>>;

export const MonthViewDay = forwardRef<HTMLDivElement, MonthViewDayProps<unknown>>(({ day, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        role: 'gridcell',
        'data-today': flag(day.isToday),
        'data-outside': flag(day.isOutside),
        'data-date': day.date.toString(),
        ...part('month-day'),
      },
      props,
    )}
    state={day}
    ref={ref}
  />
)) as <TData>(props: MonthViewDayProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

/** Fills its day for a layer in `day.backgrounds` (D33). */
export const MonthViewDayBackground = forwardRef<
  HTMLDivElement,
  { background: Calendar_DayBackground } & Calendar_HTMLProps<'div', Calendar_DayBackground>
>(({ background, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'aria-hidden': true,
        'data-kind': background.kind,
        'data-layer': background.layer,
        ...part('month-day-background'),
      },
      props,
    )}
    state={background}
    ref={ref}
  />
));

type MonthViewDayTriggerProps<TData> = { day: Calendar_MonthDay<TData>; view: string } & Calendar_HTMLProps<
  'button',
  Calendar_MonthDay<TData>
>;

export const MonthViewDayTrigger = forwardRef<HTMLButtonElement, MonthViewDayTriggerProps<unknown>>(
  ({ day, view, ...props }, ref) => {
    const { locale } = useCalendarContext();
    const navigate = useCalendarParts_NavigateTrigger(view, day.date);

    return (
      <calendar.button
        {...calendarProps_merge(
          {
            type: 'button',
            'aria-label': `Go to ${calendarParts_dateLabel(day.date, locale)}`,
            ...part('month-day-trigger'),
          },
          props,
          { onClick: navigate },
        )}
        state={day}
        ref={ref}
      />
    );
  },
) as <TData>(props: MonthViewDayTriggerProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

type MonthViewWeekEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const MonthViewWeekEvent = forwardRef<HTMLButtonElement, MonthViewWeekEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.button
      {...calendarProps_merge(
        {
          type: 'button',
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan, row: segment.row }),
          ...part('month-week-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: MonthViewWeekEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

type MonthViewWeekBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSpan<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSpan<TData>
>;

/** An all-day background event across the week row, under the bars; not interactive (D37). */
export const MonthViewWeekBackgroundEvent = forwardRef<HTMLDivElement, MonthViewWeekBackgroundEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          'aria-hidden': true,
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan }),
          ...part('month-week-background-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: MonthViewWeekBackgroundEventProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type MonthViewOverflowProps<TData> = { day: Calendar_MonthDay<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_MonthDay<TData>
>;

/** Renders only when the day has more than it shows (D14, D17). */
export const MonthViewOverflow = forwardRef<HTMLButtonElement, MonthViewOverflowProps<unknown>>(
  ({ day, ...props }, ref) => {
    if (!day.hasMore) return null;

    return (
      <calendar.button
        {...calendarProps_merge(
          { type: 'button', 'data-hidden-count': day.hiddenCount, ...part('month-overflow') },
          props,
        )}
        state={day}
        ref={ref}
      />
    );
  },
) as <TData>(props: MonthViewOverflowProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;
