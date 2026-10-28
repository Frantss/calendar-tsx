import type {
  TimeGridViewProps,
  ColumnProps,
  TimeGridViewColumnTriggerProps,
  TimeGridViewAllDayEventProps,
  TimeGridViewAllDayBackgroundEventProps,
  TimeGridViewBackgroundEventProps,
  TimeGridViewEventProps,
} from '#views/time-grid/time-grid-view.types';
import { Show, splitProps } from '#rendering/solid';

import type {
  Calendar_BackgroundSegment,
  Calendar_TimeGridSlot,
  Calendar_UnavailableSegment,
  Calendar_Views,
} from '@calendar-tsx/core';

import type { Calendar_HTMLProps } from '#rendering/rendering.types';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#rendering/factory';
import {
  calendarParts_dateLabel,
  calendarParts_flag as flag,
  calendarParts_attributes as part,
  useCalendarParts_NavigateTrigger,
  calendarParts_vars as vars,
} from '#views/shared/parts';
import { useCalendarContext } from '#calendar/calendar';

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
            'slot-units': local.model.slotUnits,
            'slots-per-hour': 60 / local.model.slotMinutes,
            'hour-offset': local.model.hourOffset,
            'all-day-rows': local.model.allDay?.rows,
            'min-column-width': local.model.minColumnWidth,
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

export const TimeGridViewColumnHeader = <TData, TResourceData>(props: ColumnProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['column']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-today': flag(local.column.isToday),
          'data-weekday': local.column.date.dayOfWeek,
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

export const TimeGridViewColumnTrigger = <TData, TResourceData, const TViews extends Calendar_Views>(
  props: TimeGridViewColumnTriggerProps<TData, TResourceData, TViews>,
) => {
  const [local, rest] = splitProps(props, ['column', 'calendar', 'view']);
  const context = useCalendarContext();
  const navigate = useCalendarParts_NavigateTrigger(local, () => local.column.date);

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

export const TimeGridViewAllDayEvent = <TData,>(props: TimeGridViewAllDayEventProps<TData>) => {
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
          ...part('time-grid-all-day-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

/** An all-day background event across the all-day row, under the bars; not interactive (D37). */
export const TimeGridViewAllDayBackgroundEvent = <TData,>(props: TimeGridViewAllDayBackgroundEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': 'true',
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({ 'col-start': local.segment.colStart, 'col-span': local.segment.colSpan }),
          ...part('time-grid-all-day-background-event'),
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
          style: vars({
            slots: local.model.slots.length,
            'slot-units': local.model.slotUnits,
            'slots-per-hour': 60 / local.model.slotMinutes,
            'hour-offset': local.model.hourOffset,
          }),
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

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          style: vars({ start: local.slot.start, span: local.slot.span }),
          'data-day-offset': local.slot.dayOffset,
          ...part('time-grid-axis-label'),
        }),
        rest,
      )}
      state={local.slot}
    />
  );
};

export const TimeGridViewColumn = <TData, TResourceData>(props: ColumnProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['column']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-today': flag(local.column.isToday),
          'data-weekday': local.column.date.dayOfWeek,
          'data-unavailable': flag(local.column.isUnavailable),
          style: vars({ 'column-lanes': local.column.lanes }),
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
          'aria-hidden': 'true',
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
          'aria-hidden': 'true',
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

/** A background event in a column, under the events; not interactive (D37). */
export const TimeGridViewBackgroundEvent = <TData,>(props: TimeGridViewBackgroundEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': 'true',
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({ start: local.segment.start, span: local.segment.span }),
          ...part('time-grid-background-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

export const TimeGridViewEvent = <TData,>(props: TimeGridViewEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'data-overlap': flag(local.segment.lanes > 1),
          'data-short': flag(local.segment.isShort),
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({
            start: local.segment.start,
            span: local.segment.span,
            lane: local.segment.lane,
            lanes: local.segment.lanes,
            'inline-start': local.segment.inlineStart,
            'inline-size': local.segment.inlineSize,
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
          () => ({ 'aria-hidden': 'true', style: vars({ now: local.column.now }), ...part('time-grid-now') }),
          rest,
        )}
        state={local.column}
      />
    </Show>
  );
};
