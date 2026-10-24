import type { Calendar_ListLayout, Calendar_ListSection, Calendar_ListDay, Calendar_Event } from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#rendering/rendering.types';

export type ListViewProps<TData, TResourceData> = {
  model: Calendar_ListLayout<TData, TResourceData>;
} & Calendar_HTMLProps<'div', Calendar_ListLayout<TData, TResourceData>>;

export type SectionProps<TData, TResourceData> = {
  section: Calendar_ListSection<TData, TResourceData>;
} & Calendar_HTMLProps<'section', Calendar_ListSection<TData, TResourceData>>;

export type SectionHeaderProps<TData, TResourceData> = {
  section: Calendar_ListSection<TData, TResourceData>;
} & Calendar_HTMLProps<'h2', Calendar_ListSection<TData, TResourceData>>;

export type DayProps<TData, TResourceData> = { day: Calendar_ListDay<TData, TResourceData> };

export type ListViewDayProps<TData, TResourceData> = DayProps<TData, TResourceData> &
  Calendar_HTMLProps<'section', Calendar_ListDay<TData, TResourceData>>;

export type ListViewDayHeaderProps<TData, TResourceData> = DayProps<TData, TResourceData> &
  Calendar_HTMLProps<'h3', Calendar_ListDay<TData, TResourceData>>;

export type ListViewEventProps<TData> = { event: Calendar_Event<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_Event<TData>
>;
