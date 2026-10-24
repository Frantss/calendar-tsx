import type {
  Calendar_TimelineLayout,
  Calendar_TimelineRow,
  Calendar_TimelineSegment,
  Calendar_BackgroundEventSegment,
} from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#rendering/rendering.types';

export type Timeline<TData, TResourceData> = Calendar_TimelineLayout<TData, TResourceData>;

export type Row<TData, TResourceData> = Calendar_TimelineRow<TData, TResourceData>;

export type TimelineViewProps<TData, TResourceData> = { model: Timeline<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Timeline<TData, TResourceData>
>;

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
