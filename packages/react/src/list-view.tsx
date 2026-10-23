import type { ReactElement, RefAttributes } from 'react';
import { createContext, forwardRef, useContext } from 'react';

import type { Calendar_Event, Calendar_ListDay, Calendar_ListLayout } from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#calendar-factory';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#calendar-factory';
import { calendarParts_attributes as part } from '#calendar-parts';

const ListView_Context = createContext<Calendar_ListLayout<unknown> | null>(null);

type ListView_RootProps<TData> = { model: Calendar_ListLayout<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_ListLayout<TData>
>;

export const ListView_Root = forwardRef<HTMLDivElement, ListView_RootProps<unknown>>(({ model, ...props }, ref) => (
  <ListView_Context.Provider value={model}>
    <calendar.div
      {...calendarProps_merge({ role: 'region', 'aria-label': 'Event list', ...part('list-root') }, props)}
      state={model}
      ref={ref}
    />
  </ListView_Context.Provider>
)) as <TData>(props: ListView_RootProps<TData> & RefAttributes<HTMLDivElement>) => ReactElement | null;

type DayProps<TData> = { day: Calendar_ListDay<TData> };

type ListView_DayProps<TData> = DayProps<TData> & Calendar_HTMLProps<'section', Calendar_ListDay<TData>>;

export const ListView_Day = forwardRef<HTMLElement, ListView_DayProps<unknown>>(({ day, ...props }, ref) => (
  <calendar.section
    {...calendarProps_merge({ 'data-date': day.date.toString(), ...part('list-day') }, props)}
    state={day}
    ref={ref}
  />
)) as <TData>(props: ListView_DayProps<TData> & RefAttributes<HTMLElement>) => ReactElement | null;

type ListView_DayHeaderProps<TData> = DayProps<TData> & Calendar_HTMLProps<'h3', Calendar_ListDay<TData>>;

export const ListView_DayHeader = forwardRef<HTMLHeadingElement, ListView_DayHeaderProps<unknown>>(
  ({ day, ...props }, ref) => (
    <calendar.h3 {...calendarProps_merge(part('list-day-header'), props)} state={day} ref={ref} />
  ),
) as <TData>(props: ListView_DayHeaderProps<TData> & RefAttributes<HTMLHeadingElement>) => ReactElement | null;

type ListView_EventProps<TData> = { event: Calendar_Event<TData> } & Calendar_HTMLProps<
  'button',
  Calendar_Event<TData>
>;

export const ListView_Event = forwardRef<HTMLButtonElement, ListView_EventProps<unknown>>(
  ({ event, ...props }, ref) => (
    <calendar.button
      {...calendarProps_merge({ type: 'button', ...part('list-event') }, props)}
      state={event}
      ref={ref}
    />
  ),
) as <TData>(props: ListView_EventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

/** Renders only when the list has no days (D18). */
export const ListView_Empty = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => {
  const model = useContext(ListView_Context);

  if (model && model.days.length > 0) return null;

  return <calendar.div {...calendarProps_merge(part('list-empty'), props)} ref={ref} />;
});
