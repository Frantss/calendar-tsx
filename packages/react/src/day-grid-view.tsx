import type { ReactElement, RefAttributes } from 'react';
import { forwardRef } from 'react';
import type { Temporal } from 'temporal-polyfill';

import type {
  Calendar_BackgroundEventSpan,
  Calendar_BarSegment,
  Calendar_DayBackground,
  Calendar_DayGridDay,
  Calendar_DayGridLayout,
  Calendar_DayGridWeek,
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

type DayGridViewProps<TData> = { model: Calendar_DayGridLayout<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_DayGridLayout<TData>
>;

export const DayGridView = forwardRef<HTMLDivElement, DayGridViewProps<unknown>>(({ model, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      { role: 'grid', style: vars({ columns: model.weekdays.length }), ...part('day-grid-root') },
      props,
    )}
    state={model}
    ref={ref}
  />
)) as <TData>(props: DayGridViewProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

export const DayGridViewHeader = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge({ role: 'row', ...part('day-grid-header') }, props)} ref={ref} />
));

export const DayGridViewHeaderCell = forwardRef<
  HTMLDivElement,
  { weekday: Temporal.PlainDate } & Calendar_HTMLProps<'div', Temporal.PlainDate>
>(({ weekday, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      { role: 'columnheader', 'data-weekday': weekday.dayOfWeek, ...part('day-grid-header-cell') },
      props,
    )}
    state={weekday}
    ref={ref}
  />
));

type DayGridViewWeekProps<TData> = { week: Calendar_DayGridWeek<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_DayGridWeek<TData>
>;

export const DayGridViewWeek = forwardRef<HTMLDivElement, DayGridViewWeekProps<unknown>>(({ week, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      { role: 'row', style: vars({ rows: week.rows, columns: week.days.length }), ...part('day-grid-week') },
      props,
    )}
    state={week}
    ref={ref}
  />
)) as <TData>(props: DayGridViewWeekProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type DayGridViewDayProps<TData> = { day: Calendar_DayGridDay<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_DayGridDay<TData>
>;

export const DayGridViewDay = forwardRef<HTMLDivElement, DayGridViewDayProps<unknown>>(({ day, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        role: 'gridcell',
        'data-today': flag(day.isToday),
        'data-outside': flag(day.isOutside),
        'data-date': day.date.toString(),
        ...part('day-grid-day'),
      },
      props,
    )}
    state={day}
    ref={ref}
  />
)) as <TData>(props: DayGridViewDayProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

/** Fills its day for a layer in `day.backgrounds` (D33). */
export const DayGridViewDayBackground = forwardRef<
  HTMLDivElement,
  { background: Calendar_DayBackground } & Calendar_HTMLProps<'div', Calendar_DayBackground>
>(({ background, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        'aria-hidden': true,
        'data-kind': background.kind,
        'data-layer': background.layer,
        ...part('day-grid-day-background'),
      },
      props,
    )}
    state={background}
    ref={ref}
  />
));

type DayGridViewDayTriggerProps<TData> = { day: Calendar_DayGridDay<TData>; view: string } & Calendar_HTMLProps<
  'button',
  Calendar_DayGridDay<TData>
>;

export const DayGridViewDayTrigger = forwardRef<HTMLButtonElement, DayGridViewDayTriggerProps<unknown>>(
  ({ day, view, ...props }, ref) => {
    const { locale } = useCalendarContext();
    const navigate = useCalendarParts_NavigateTrigger(view, day.date);

    return (
      <calendar.button
        {...calendarProps_merge(
          {
            type: 'button',
            'aria-label': `Go to ${calendarParts_dateLabel(day.date, locale)}`,
            ...part('day-grid-day-trigger'),
          },
          props,
          { onClick: navigate },
        )}
        state={day}
        ref={ref}
      />
    );
  },
) as <TData>(props: DayGridViewDayTriggerProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

type DayGridViewWeekEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const DayGridViewWeekEvent = forwardRef<HTMLButtonElement, DayGridViewWeekEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.button
      {...calendarProps_merge(
        {
          type: 'button',
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan, row: segment.row }),
          ...part('day-grid-week-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: DayGridViewWeekEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

type DayGridViewWeekBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSpan<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSpan<TData>
>;

/** An all-day background event across the week row, under the bars; not interactive (D37). */
export const DayGridViewWeekBackgroundEvent = forwardRef<HTMLDivElement, DayGridViewWeekBackgroundEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          'aria-hidden': true,
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan }),
          ...part('day-grid-week-background-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: DayGridViewWeekBackgroundEventProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type DayGridViewOverflowProps<TData> = { day: Calendar_DayGridDay<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_DayGridDay<TData>
>;

/** Renders only when the day has more than it shows (D14, D17). */
export const DayGridViewOverflow = forwardRef<HTMLButtonElement, DayGridViewOverflowProps<unknown>>(
  ({ day, ...props }, ref) => {
    if (!day.hasMore) return null;

    return (
      <calendar.button
        {...calendarProps_merge(
          { type: 'button', 'data-hidden-count': day.hiddenCount, ...part('day-grid-overflow') },
          props,
        )}
        state={day}
        ref={ref}
      />
    );
  },
) as <TData>(props: DayGridViewOverflowProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;
