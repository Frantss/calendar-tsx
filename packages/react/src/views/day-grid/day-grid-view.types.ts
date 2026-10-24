import type {
  Calendar_DayGridLayout,
  Calendar_DayGridSection,
  Calendar_DayGridColumn,
  Calendar_DayGridRow,
  Calendar_DayGridDay,
  Calendar_Views,
  Calendar_BarSegment,
  Calendar_BackgroundEventSpan,
} from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#rendering/rendering.types';
import type { CalendarParts_NavigateProps } from '#views/shared/parts';

export type DayGridViewProps<TData, TResourceData> = {
  model: Calendar_DayGridLayout<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridLayout<TData, TResourceData>>;

export type SectionProps<TData, TResourceData> = {
  section: Calendar_DayGridSection<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridSection<TData, TResourceData>>;

export type ColumnProps<TResourceData> = { column: Calendar_DayGridColumn<TResourceData> } & Calendar_HTMLProps<
  'div',
  Calendar_DayGridColumn<TResourceData>
>;

export type DayGridViewRowProps<TData, TResourceData> = {
  row: Calendar_DayGridRow<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridRow<TData, TResourceData>>;

export type DayGridViewDayProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_DayGridDay<TData, TResourceData>>;

export type DayGridViewDayTriggerProps<TData, TResourceData, TViews extends Calendar_Views> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
} & CalendarParts_NavigateProps<TViews> &
  Calendar_HTMLProps<'button', Calendar_DayGridDay<TData, TResourceData>>;

export type DayGridViewRowEventProps<TData> = { segment: Calendar_BarSegment<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_BarSegment<TData>
>;

export type DayGridViewRowBackgroundEventProps<TData> = {
  segment: Calendar_BackgroundEventSpan<TData>;
} & Calendar_HTMLProps<'div', Calendar_BackgroundEventSpan<TData>>;

export type DayGridViewOverflowProps<TData, TResourceData> = {
  day: Calendar_DayGridDay<TData, TResourceData>;
} & Calendar_HTMLProps<'button', Calendar_DayGridDay<TData, TResourceData>>;
