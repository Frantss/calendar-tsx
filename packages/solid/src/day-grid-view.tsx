import { Show, splitProps } from 'solid-js';
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

export const DayGridView = <TData,>(props: DayGridViewProps<TData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({ role: 'grid', style: vars({ columns: local.model.weekdays.length }), ...part('day-grid-root') }),
        rest,
      )}
      state={local.model}
    />
  );
};

export const DayGridViewHeader = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge({ role: 'row', ...part('day-grid-header') }, props)} />
);

export const DayGridViewHeaderCell = (
  props: { weekday: Temporal.PlainDate } & Calendar_HTMLProps<'div', Temporal.PlainDate>,
) => {
  const [local, rest] = splitProps(props, ['weekday']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({ role: 'columnheader', 'data-weekday': local.weekday.dayOfWeek, ...part('day-grid-header-cell') }),
        rest,
      )}
      state={local.weekday}
    />
  );
};

type DayGridViewWeekProps<TData> = { week: Calendar_DayGridWeek<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_DayGridWeek<TData>
>;

export const DayGridViewWeek = <TData,>(props: DayGridViewWeekProps<TData>) => {
  const [local, rest] = splitProps(props, ['week']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'row',
          style: vars({ rows: local.week.rows, columns: local.week.days.length }),
          ...part('day-grid-week'),
        }),
        rest,
      )}
      state={local.week}
    />
  );
};

type DayGridViewDayProps<TData> = { day: Calendar_DayGridDay<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_DayGridDay<TData>
>;

export const DayGridViewDay = <TData,>(props: DayGridViewDayProps<TData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'gridcell',
          'data-today': flag(local.day.isToday),
          'data-outside': flag(local.day.isOutside),
          'data-date': local.day.date.toString(),
          ...part('day-grid-day'),
        }),
        rest,
      )}
      state={local.day}
    />
  );
};

/** Fills its day for a layer in `day.backgrounds` (D33). */
export const DayGridViewDayBackground = (
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
          ...part('day-grid-day-background'),
        }),
        rest,
      )}
      state={local.background}
    />
  );
};

type DayGridViewDayTriggerProps<TData> = { day: Calendar_DayGridDay<TData>; view: string } & Calendar_HTMLProps<
  'button',
  Calendar_DayGridDay<TData>
>;

export const DayGridViewDayTrigger = <TData,>(props: DayGridViewDayTriggerProps<TData>) => {
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
          ...part('day-grid-day-trigger'),
        }),
        rest,
        { onClick: navigate },
      )}
      state={local.day}
    />
  );
};

type DayGridViewWeekEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const DayGridViewWeekEvent = <TData,>(props: DayGridViewWeekEventProps<TData>) => {
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
          ...part('day-grid-week-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

type DayGridViewWeekBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSpan<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSpan<TData>
>;

/** An all-day background event across the week row, under the bars; not interactive (D37). */
export const DayGridViewWeekBackgroundEvent = <TData,>(props: DayGridViewWeekBackgroundEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({ 'col-start': local.segment.colStart, 'col-span': local.segment.colSpan }),
          ...part('day-grid-week-background-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

type DayGridViewOverflowProps<TData> = { day: Calendar_DayGridDay<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_DayGridDay<TData>
>;

/** Renders only when the day has more than it shows (D14, D17). */
export const DayGridViewOverflow = <TData,>(props: DayGridViewOverflowProps<TData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <Show when={local.day.hasMore}>
      <calendar.button
        {...calendarProps_merge(
          () => ({ type: 'button', 'data-hidden-count': local.day.hiddenCount, ...part('day-grid-overflow') }),
          rest,
        )}
        state={local.day}
      />
    </Show>
  );
};
