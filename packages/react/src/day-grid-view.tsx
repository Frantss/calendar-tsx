import type { ReactElement, RefAttributes } from 'react';
import { forwardRef } from 'react';

import type {
  Calendar_BackgroundEventSpan,
  Calendar_BarSegment,
  Calendar_DayBackground,
  Calendar_DayGridDay,
  Calendar_DayGridLayout,
  Calendar_DayGridSection,
  Calendar_DayGridColumn,
  Calendar_DayGridRow,
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

type DayGridViewProps<TData, TResourceData> = {
  model: Calendar_DayGridLayout<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridLayout<TData, TResourceData>>;

export const DayGridView = forwardRef<HTMLDivElement, DayGridViewProps<unknown, unknown>>(
  ({ model, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          role: 'region',
          'aria-label': 'Calendar',
          'data-multi-month': flag(
            model.sections.length > 1 &&
              model.sections.every(
                section => section.month && !section.resource && section.columns.every(column => !column.resource),
              ),
          ),
          style: vars({ 'month-rows': Math.max(0, ...model.sections.map(section => section.rows.length)) }),
          ...part('day-grid-root'),
        },
        props,
      )}
      state={model}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: DayGridViewProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const DayGridViewHeader = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge({ role: 'row', ...part('day-grid-header') }, props)} ref={ref} />
));

type SectionProps<TData, TResourceData> = {
  section: Calendar_DayGridSection<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridSection<TData, TResourceData>>;

export const DayGridViewSection = forwardRef<HTMLDivElement, SectionProps<unknown, unknown>>(
  ({ section, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          role: 'grid',
          style: vars({ columns: Math.max(1, section.columnCount) }),
          'data-month': section.month?.toString(),
          'data-resource-id': section.resource?.id,
          ...part('day-grid-section'),
        },
        props,
      )}
      state={section}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: SectionProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const DayGridViewSectionHeader = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => (
  <calendar.div {...calendarProps_merge(part('day-grid-section-header'), props)} ref={ref} />
));

type ColumnProps<TResourceData> = { column: Calendar_DayGridColumn<TResourceData> } & Calendar_HTMLProps<
  'div',
  Calendar_DayGridColumn<TResourceData>
>;

export const DayGridViewHeaderCell = forwardRef<HTMLDivElement, ColumnProps<unknown>>(({ column, ...props }, ref) => (
  <calendar.div
    {...calendarProps_merge(
      {
        role: 'columnheader',
        'data-weekday': column.date.dayOfWeek,
        'data-resource-id': column.resource?.id,
        ...part('day-grid-header-cell'),
      },
      props,
    )}
    state={column}
    ref={ref}
  />
)) as <TResourceData>(props: ColumnProps<TResourceData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type DayGridViewRowProps<TData, TResourceData> = {
  row: Calendar_DayGridRow<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridRow<TData, TResourceData>>;

export const DayGridViewRow = forwardRef<HTMLDivElement, DayGridViewRowProps<unknown, unknown>>(
  ({ row, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          role: 'row',
          style: vars({ rows: row.stackCount, columns: Math.max(1, row.columnCount) }),
          ...part('day-grid-row'),
        },
        props,
      )}
      state={row}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: DayGridViewRowProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

type DayGridViewDayProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridDay<TData, TResourceData>>;

export const DayGridViewDay = forwardRef<HTMLDivElement, DayGridViewDayProps<unknown, unknown>>(
  ({ day, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          role: 'gridcell',
          'data-today': flag(day.isToday),
          'data-outside': flag(day.isOutside),
          'data-date': day.date.toString(),
          'data-resource-id': day.resource?.id,
          'data-unavailable': flag(day.isUnavailable),
          ...part('day-grid-day'),
        },
        props,
      )}
      state={day}
      ref={ref}
    />
  ),
) as <TData, TResourceData>(
  props: DayGridViewDayProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

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

type DayGridViewDayTriggerProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
  view: string;
} & Calendar_HTMLProps<'button', Calendar_DayGridDay<TData, TResourceData>>;

export const DayGridViewDayTrigger = forwardRef<HTMLButtonElement, DayGridViewDayTriggerProps<unknown, unknown>>(
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
) as <TData, TResourceData>(
  props: DayGridViewDayTriggerProps<TData, TResourceData> & RefAttributes<HTMLButtonElement>,
) => ReactElement | null;

type DayGridViewRowEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const DayGridViewRowEvent = forwardRef<HTMLButtonElement, DayGridViewRowEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.button
      {...calendarProps_merge(
        {
          type: 'button',
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan, row: segment.row }),
          ...part('day-grid-row-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: DayGridViewRowEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

type DayGridViewRowBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSpan<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSpan<TData>
>;

/** An all-day background event across the row, under the bars; not interactive (D37). */
export const DayGridViewRowBackgroundEvent = forwardRef<HTMLDivElement, DayGridViewRowBackgroundEventProps<unknown>>(
  ({ segment, ...props }, ref) => (
    <calendar.div
      {...calendarProps_merge(
        {
          'aria-hidden': true,
          'data-continues-before': flag(segment.continuesBefore),
          'data-continues-after': flag(segment.continuesAfter),
          style: vars({ 'col-start': segment.colStart, 'col-span': segment.colSpan }),
          ...part('day-grid-row-background-event'),
        },
        props,
      )}
      state={segment}
      ref={ref}
    />
  ),
) as <TData>(props: DayGridViewRowBackgroundEventProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type DayGridViewOverflowProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
} & Calendar_HTMLProps<'button', Calendar_DayGridDay<TData, TResourceData>>;

/** Renders only when the day has more than it shows (D14, D17). */
export const DayGridViewOverflow = forwardRef<HTMLButtonElement, DayGridViewOverflowProps<unknown, unknown>>(
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
) as <TData, TResourceData>(
  props: DayGridViewOverflowProps<TData, TResourceData> & RefAttributes<HTMLButtonElement>,
) => ReactElement | null;
