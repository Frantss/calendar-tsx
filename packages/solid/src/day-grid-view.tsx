import { Show, splitProps } from 'solid-js';

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

export const DayGridView = <TData, TResourceData>(props: DayGridViewProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'region',
          'aria-label': 'Calendar',
          'data-multi-month': flag(
            local.model.sections.length > 1 &&
              local.model.sections.every(
                section => section.month && !section.resource && section.columns.every(column => !column.resource),
              ),
          ),
          style: vars({ 'month-rows': Math.max(0, ...local.model.sections.map(section => section.rows.length)) }),
          ...part('day-grid-root'),
        }),
        rest,
      )}
      state={local.model}
    />
  );
};

export const DayGridViewHeader = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge({ role: 'row', ...part('day-grid-header') }, props)} />
);

export const DayGridViewSection = <TData, TResourceData>(
  props: { section: Calendar_DayGridSection<TData, TResourceData> } & Calendar_HTMLProps<
    'div',
    Calendar_DayGridSection<TData, TResourceData>
  >,
) => {
  const [local, rest] = splitProps(props, ['section']);
  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'grid',
          style: vars({ columns: Math.max(1, local.section.columnCount) }),
          'data-month': local.section.month?.toString(),
          'data-resource-id': local.section.resource?.id,
          ...part('day-grid-section'),
        }),
        rest,
      )}
      state={local.section}
    />
  );
};

export const DayGridViewSectionHeader = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('day-grid-section-header'), props)} />
);

export const DayGridViewHeaderCell = <TResourceData,>(
  props: { column: Calendar_DayGridColumn<TResourceData> } & Calendar_HTMLProps<
    'div',
    Calendar_DayGridColumn<TResourceData>
  >,
) => {
  const [local, rest] = splitProps(props, ['column']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'columnheader',
          'data-weekday': local.column.date.dayOfWeek,
          'data-resource-id': local.column.resource?.id,
          ...part('day-grid-header-cell'),
        }),
        rest,
      )}
      state={local.column}
    />
  );
};

type DayGridViewRowProps<TData, TResourceData> = {
  row: Calendar_DayGridRow<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridRow<TData, TResourceData>>;

export const DayGridViewRow = <TData, TResourceData>(props: DayGridViewRowProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['row']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'row',
          style: vars({ rows: local.row.stackCount, columns: Math.max(1, local.row.columnCount) }),
          ...part('day-grid-row'),
        }),
        rest,
      )}
      state={local.row}
    />
  );
};

type DayGridViewDayProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridDay<TData, TResourceData>>;

export const DayGridViewDay = <TData, TResourceData>(props: DayGridViewDayProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'gridcell',
          'data-today': flag(local.day.isToday),
          'data-outside': flag(local.day.isOutside),
          'data-weekday': local.day.date.dayOfWeek,
          'data-date': local.day.date.toString(),
          'data-resource-id': local.day.resource?.id,
          'data-unavailable': flag(local.day.isUnavailable),
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

type DayGridViewDayTriggerProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
  view: string;
} & Calendar_HTMLProps<'button', Calendar_DayGridDay<TData, TResourceData>>;

export const DayGridViewDayTrigger = <TData, TResourceData>(
  props: DayGridViewDayTriggerProps<TData, TResourceData>,
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
          ...part('day-grid-day-trigger'),
        }),
        rest,
        { onClick: navigate },
      )}
      state={local.day}
    />
  );
};

type DayGridViewRowEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export const DayGridViewRowEvent = <TData,>(props: DayGridViewRowEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'data-all-day': flag(local.segment.isAllDay),
          'data-multi-day': flag(local.segment.isMultiDay),
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({
            'col-start': local.segment.colStart,
            'col-span': local.segment.colSpan,
            row: local.segment.row,
          }),
          ...part('day-grid-row-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

type DayGridViewRowBackgroundEventProps<TData> = { segment: Calendar_BackgroundEventSpan<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_BackgroundEventSpan<TData>
>;

/** An all-day background event across the row, under the bars; not interactive (D37). */
export const DayGridViewRowBackgroundEvent = <TData,>(props: DayGridViewRowBackgroundEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({ 'col-start': local.segment.colStart, 'col-span': local.segment.colSpan }),
          ...part('day-grid-row-background-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

type DayGridViewOverflowProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
} & Calendar_HTMLProps<'button', Calendar_DayGridDay<TData, TResourceData>>;

/** Renders only when the day has more than it shows (D14, D17). */
export const DayGridViewOverflow = <TData, TResourceData>(props: DayGridViewOverflowProps<TData, TResourceData>) => {
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
