import type {
  Calendar_TimeGridLayout,
  Calendar_TimeGridColumn,
  Calendar_Views,
  Calendar_BarSegment,
  Calendar_BackgroundEventSpan,
  Calendar_BackgroundEventSegment,
  Calendar_TimeGridSegment,
} from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#rendering/rendering.types';
import type { CalendarParts_NavigateProps } from '#views/shared/parts';

export type Grid<TData, TResourceData> = Calendar_TimeGridLayout<TData, TResourceData>;

export type Column<TData, TResourceData> = Calendar_TimeGridColumn<TData, TResourceData>;

export type TimeGridViewProps<TData, TResourceData> = { model: Grid<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Grid<TData, TResourceData>
>;

export type ColumnProps<TData, TResourceData> = { column: Column<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Column<TData, TResourceData>
>;

export type TimeGridViewColumnTriggerProps<TData, TResourceData, TViews extends Calendar_Views> = {
  column: Column<TData, TResourceData>;
} & CalendarParts_NavigateProps<TViews> &
  Calendar_HTMLProps<'button', Column<TData, TResourceData>>;

export type TimeGridViewAllDayEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export type TimeGridViewAllDayBackgroundEventProps<TData> = {
  segment: Calendar_BackgroundEventSpan<TData>;
} & Calendar_HTMLProps<'div', Calendar_BackgroundEventSpan<TData>>;

export type TimeGridViewBackgroundEventProps<TData> = {
  segment: Calendar_BackgroundEventSegment<TData>;
} & Calendar_HTMLProps<'div', Calendar_BackgroundEventSegment<TData>>;

export type TimeGridViewEventProps<TData> = { segment: Calendar_TimeGridSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_TimeGridSegment<TData>
>;
