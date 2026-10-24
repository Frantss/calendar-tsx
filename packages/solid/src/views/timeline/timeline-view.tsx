import type {
  TimelineViewProps,
  RowProps,
  TimelineViewEventProps,
  TimelineViewBackgroundEventProps,
} from '#views/timeline/timeline-view.types';
import { Show, splitProps } from 'solid-js';

import type {
  Calendar_BackgroundSegment,
  Calendar_TimelineDay,
  Calendar_TimelineSlot,
  Calendar_UnavailableSegment,
  Calendar_Views,
} from '@calendar-tsx/core';
import type { CalendarParts_NavigateProps } from '#views/shared/parts';
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

export const TimelineView = <TData, TResourceData>(props: TimelineViewProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          role: 'region',
          'aria-label': 'Timeline',
          style: vars({
            slots: local.model.slots.length,
            'slot-units': local.model.slotUnits,
            'slots-per-hour': 60 / local.model.slotMinutes,
            'hour-offset': local.model.hourOffset,
            days: local.model.days.length,
            'day-slot-units': local.model.slotUnits / Math.max(1, local.model.days.length),
            'slot-columns': local.model.slots.map(slot => `minmax(0, ${slot.span}fr)`).join(' ') || 'minmax(0, 1fr)',
            'min-slot-width': local.model.minSlotWidth,
          }),
          ...part('timeline-root'),
        }),
        rest,
      )}
      state={local.model}
    />
  );
};

export const TimelineViewHeader = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('timeline-header'), props)} />
);

export const TimelineViewDayHeader = (
  props: { day: Calendar_TimelineDay } & Calendar_HTMLProps<'div', Calendar_TimelineDay>,
) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-today': flag(local.day.isToday),
          'data-weekday': local.day.date.dayOfWeek,
          'data-date': local.day.date.toString(),
          style: vars({ 'col-start': local.day.colStart, 'col-span': local.day.colSpan }),
          ...part('timeline-day-header'),
        }),
        rest,
      )}
      state={local.day}
    />
  );
};

export const TimelineViewDayTrigger = <const TViews extends Calendar_Views>(
  props: { day: Calendar_TimelineDay } & CalendarParts_NavigateProps<TViews> &
    Calendar_HTMLProps<'button', Calendar_TimelineDay>,
) => {
  const [local, rest] = splitProps(props, ['day', 'calendar', 'view']);
  const context = useCalendarContext();
  const navigate = useCalendarParts_NavigateTrigger(local, () => local.day.date);

  return (
    <calendar.button
      {...calendarProps_merge(
        () => ({
          type: 'button',
          'aria-label': `Go to ${calendarParts_dateLabel(local.day.date, context.locale)}`,
          ...part('timeline-day-trigger'),
        }),
        rest,
        { onClick: navigate },
      )}
      state={local.day}
    />
  );
};

/** `slot` is the header's slot model, not the native HTML attribute. */
export const TimelineViewSlotLabel = (
  props: { slot: Calendar_TimelineSlot } & Calendar_HTMLProps<'div', Calendar_TimelineSlot>,
) => {
  const [local, rest] = splitProps(props, ['slot']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          style: vars({ 'col-start': local.slot.col }),
          'data-day-offset': local.slot.dayOffset,
          ...part('timeline-slot-label'),
        }),
        rest,
      )}
      state={local.slot}
    />
  );
};

export const TimelineViewBody = (props: Calendar_HTMLProps<'div'>) => (
  <calendar.div {...calendarProps_merge(part('timeline-body'), props)} />
);

export const TimelineViewRow = <TData, TResourceData>(props: RowProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['row']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-unavailable': flag(local.row.isUnavailable),
          'data-resource-id': local.row.resource?.id,
          style: vars({ rows: local.row.rows }),
          ...part('timeline-row'),
        }),
        rest,
      )}
      state={local.row}
    />
  );
};

export const TimelineViewResource = <TData, TResourceData>(props: RowProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['row']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'data-unavailable': flag(local.row.isUnavailable),
          'data-resource-id': local.row.resource?.id,
          ...part('timeline-resource'),
        }),
        rest,
      )}
      state={local.row}
    />
  );
};

export const TimelineViewLane = <TData, TResourceData>(props: RowProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['row']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({ 'data-unavailable': flag(local.row.isUnavailable), ...part('timeline-lane') }),
        rest,
      )}
      state={local.row}
    />
  );
};

export const TimelineViewEvent = <TData,>(props: TimelineViewEventProps<TData>) => {
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
          style: vars({ start: local.segment.start, span: local.segment.span, row: local.segment.row }),
          ...part('timeline-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

export const TimelineViewUnavailable = (
  props: { segment: Calendar_UnavailableSegment } & Calendar_HTMLProps<'div', Calendar_UnavailableSegment>,
) => {
  const [local, rest] = splitProps(props, ['segment']);

  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          style: vars({ start: local.segment.start, span: local.segment.span }),
          ...part('timeline-unavailable'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

export const TimelineViewBackground = (
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
          ...part('timeline-background'),
        }),
        rest,
      )}
      state={local.background}
    />
  );
};

export const TimelineViewBackgroundEvent = <TData,>(props: TimelineViewBackgroundEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['segment']);
  return (
    <calendar.div
      {...calendarProps_merge(
        () => ({
          'aria-hidden': true,
          'data-continues-before': flag(local.segment.continuesBefore),
          'data-continues-after': flag(local.segment.continuesAfter),
          style: vars({ start: local.segment.start, span: local.segment.span }),
          ...part('timeline-background-event'),
        }),
        rest,
      )}
      state={local.segment}
    />
  );
};

/** Renders only when now is inside the range (D11, D34). */
export const TimelineViewNowIndicator = <TData, TResourceData>(props: TimelineViewProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <Show when={local.model.now !== undefined}>
      <calendar.div
        {...calendarProps_merge(
          () => ({ 'aria-hidden': true, style: vars({ now: local.model.now }), ...part('timeline-now') }),
          rest,
        )}
        state={local.model}
      />
    </Show>
  );
};
