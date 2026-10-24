import type {
  Calendar_TimelineLayout,
  Calendar_TimelineRow,
  Calendar_TimelineDay,
  Calendar_Views,
  Calendar_TimelineSegment,
  Calendar_BackgroundEventSegment,
} from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#rendering/rendering.types';
import type { CalendarParts_NavigateProps } from '#views/shared/parts';

export type Timeline<TData, TResourceData> = Calendar_TimelineLayout<TData, TResourceData>;

export type Row<TData, TResourceData> = Calendar_TimelineRow<TData, TResourceData>;

export type TimelineViewProps<TData, TResourceData> = { model: Timeline<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Timeline<TData, TResourceData>
>;

export type DayProps = { day: Calendar_TimelineDay } & Calendar_HTMLProps<'div', Calendar_TimelineDay>;

export type TimelineViewDayTriggerProps<TViews extends Calendar_Views> = {
  day: Calendar_TimelineDay;
} & CalendarParts_NavigateProps<TViews> &
  Calendar_HTMLProps<'button', Calendar_TimelineDay>;

export type RowProps<TData, TResourceData> = { row: Row<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Row<TData, TResourceData>
>;

export type TimelineViewEventProps<TData> = { segment: Calendar_TimelineSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_TimelineSegment<TData>
>;

export type TimelineViewBackgroundEventProps<TData> = {
  segment: Calendar_BackgroundEventSegment<TData>;
} & Calendar_HTMLProps<'div', Calendar_BackgroundEventSegment<TData>>;
