import type { ReactElement, RefAttributes } from 'react';
import { createContext, forwardRef, useContext } from 'react';

import type { Calendar_Event, Calendar_ListDay, Calendar_ListLayout } from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#calendar-factory';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#calendar-factory';
import { calendarParts_attributes as part } from '#calendar-parts';

const ListViewContext = createContext<Calendar_ListLayout<unknown> | null>(null);

type ListViewProps<TData> = { model: Calendar_ListLayout<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_ListLayout<TData>
>;

export const ListView = forwardRef<HTMLDivElement, ListViewProps<unknown>>(({ model, ...props }, ref) => (
  <ListViewContext.Provider value={model}>
    <calendar.div
      {...calendarProps_merge({ role: 'region', 'aria-label': 'Event list', ...part('list-root') }, props)}
      state={model}
      ref={ref}
    />
  </ListViewContext.Provider>
)) as <TData>(props: ListViewProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type DayProps<TData> = { day: Calendar_ListDay<TData> };

type ListViewDayProps<TData> = DayProps<TData> & Calendar_HTMLProps<'section', Calendar_ListDay<TData>>;

export const ListViewDay = forwardRef<HTMLElement, ListViewDayProps<unknown>>(({ day, ...props }, ref) => (
  <calendar.section
    {...calendarProps_merge({ 'data-date': day.date.toString(), ...part('list-day') }, props)}
    state={day}
    ref={ref}
  />
)) as <TData>(props: ListViewDayProps<TData> & RefAttributes<HTMLElement>) => ReactElement | null;

type ListViewDayHeaderProps<TData> = DayProps<TData> & Calendar_HTMLProps<'h3', Calendar_ListDay<TData>>;

export const ListViewDayHeader = forwardRef<HTMLHeadingElement, ListViewDayHeaderProps<unknown>>(
  ({ day, ...props }, ref) => (
    <calendar.h3 {...calendarProps_merge(part('list-day-header'), props)} state={day} ref={ref} />
  ),
) as <TData>(props: ListViewDayHeaderProps<TData> & RefAttributes<HTMLHeadingElement>) => ReactElement | null;

type ListViewEventProps<TData> = { event: Calendar_Event<TData> } & Calendar_HTMLProps<'button', Calendar_Event<TData>>;

export const ListViewEvent = forwardRef<HTMLButtonElement, ListViewEventProps<unknown>>(({ event, ...props }, ref) => (
  <calendar.button {...calendarProps_merge({ type: 'button', ...part('list-event') }, props)} state={event} ref={ref} />
)) as <TData>(props: ListViewEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

/** Renders only when the list has no days (D18). */
export const ListViewEmpty = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => {
  const model = useContext(ListViewContext);

  if (model && model.days.length > 0) return null;

  return <calendar.div {...calendarProps_merge(part('list-empty'), props)} ref={ref} />;
});
