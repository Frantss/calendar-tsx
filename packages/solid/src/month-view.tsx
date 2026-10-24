import { Show, splitProps } from 'solid-js';
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

export const MonthView = <TData,>(props: MonthViewProps<TData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({ role: 'grid', style: vars({ columns: local.model.weekdays.length }), ...part('month-root') }),
        rest,
      )}
      state={local.model}
    />
  );
};

export const MonthViewHeader = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge({ role: 'row', ...part('month-header') }, props)} />
);

export const MonthViewHeaderCell = (
  props: { weekday: Temporal.PlainDate } & Calendar_HTMLProps<'div', Temporal.PlainDate>,
) => {
  const [local, rest] = splitProps(props, ['weekday']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({ role: 'columnheader', 'data-weekday': local.weekday.dayOfWeek, ...part('month-header-cell') }),
        rest,
      )}
      state={local.weekday}
    />
  );
};

type MonthViewWeekProps<TData> = { week: Calendar_MonthWeek<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_MonthWeek<TData>
>;

export const MonthViewWeek = <TData,>(props: MonthViewWeekProps<TData>) => {
  const [local, rest] = splitProps(props, ['week']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'row',
          style: vars({ rows: local.week.rows, columns: local.week.days.length }),
          ...part('month-week'),
        }),
        rest,
      )}
      state={local.week}
    />
  );
};

type MonthViewDayProps<TData> = { day: Calendar_MonthDay<TData> } & Calendar_HTMLProps<'div', Calendar_MonthDay<TData>>;

export const MonthViewDay = <TData,>(props: MonthViewDayProps<TData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'gridcell',
          'data-today': flag(local.day.isToday),
          'data-outside': flag(local.day.isOutside),
          'data-date': local.day.date.toString(),
          ...part('month-day'),
        }),
        rest,
      )}
      state={local.day}
    />
  );
};

/** Fills its day for a layer in `day.backgrounds` (D33). */
export const MonthViewDayBackground = (
  props: { background: Calendar_DayBackground } & Calendar_HTMLProps<'div', Calendar_DayBackground>,
) => {
  const [local, rest] = splitProps(props, ['background']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          'data-kind': local.background.kind,
          'data-layer': local.background.layer,
          ...part('month-day-background'),
        }),
        rest,
      )}
      state={local.background}
    />
  );
};

type MonthViewDayTriggerProps<TData> = { day: Calendar_MonthDay<TData>; view: string } & Calendar_HTMLProps<
  'button',
  Calendar_MonthDay<TData>
>;

export const MonthViewDayTrigger = <TData,>(props: MonthViewDayTriggerProps<TData>) => {
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
          ...part('month-day-trigger'),
        }),
        rest,
        { onClick: navigate },
      )}
      state={local.day}
    />
  );
};

type MonthViewWeekEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const MonthViewWeekEvent = <TData,>(props: MonthViewWeekEventProps<TData>) => {
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
          ...part('month-week-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

type MonthViewWeekBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSpan<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSpan<TData>
>;

/** An all-day background event across the week row, under the bars; not interactive (D37). */
export const MonthViewWeekBackgroundEvent = <TData,>(props: MonthViewWeekBackgroundEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({ 'col-start': local.segment.colStart, 'col-span': local.segment.colSpan }),
          ...part('month-week-background-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

type MonthViewOverflowProps<TData> = { day: Calendar_MonthDay<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_MonthDay<TData>
>;

/** Renders only when the day has more than it shows (D14, D17). */
export const MonthViewOverflow = <TData,>(props: MonthViewOverflowProps<TData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <Show when={local.day.hasMore}>
      <calendar.button
        {...calendarProps_merge(
          () => ({ type: 'button', 'data-hidden-count': local.day.hiddenCount, ...part('month-overflow') }),
          rest,
        )}
        state={local.day}
      />
    </Show>
  );
};
