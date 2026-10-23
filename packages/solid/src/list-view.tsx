import type { Accessor } from 'solid-js';
import { Show, createContext, splitProps, useContext } from 'solid-js';

import type { Calendar_Event, Calendar_ListDay, Calendar_ListLayout } from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#calendar-factory';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#calendar-factory';
import { calendarParts_attributes as part } from '#calendar-parts';

const ListViewContext = createContext<Accessor<Calendar_ListLayout<unknown>>>();

type ListViewProps<TData> = { model: Calendar_ListLayout<TData> } & Calendar_HTMLProps<
  'div',
  Calendar_ListLayout<TData>
>;

export const ListView = <TData,>(props: ListViewProps<TData>) => {
  const [local, rest] = splitProps(props, ['model']);

  return (
    <ListViewContext.Provider value={() => local.model}>
      <calendar.div
        {...calendarProps_merge({ role: 'region', 'aria-label': 'Event list', ...part('list-root') }, rest)}
        state={local.model}
      />
    </ListViewContext.Provider>
  );
};

type DayProps<TData> = { day: Calendar_ListDay<TData> };

type ListViewDayProps<TData> = DayProps<TData> & Calendar_HTMLProps<'section', Calendar_ListDay<TData>>;

export const ListViewDay = <TData,>(props: ListViewDayProps<TData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <calendar.section
      {...calendarProps_merge(() => ({ 'data-date': local.day.date.toString(), ...part('list-day') }), rest)}
      state={local.day}
    />
  );
};

type ListViewDayHeaderProps<TData> = DayProps<TData> & Calendar_HTMLProps<'h3', Calendar_ListDay<TData>>;

export const ListViewDayHeader = <TData,>(props: ListViewDayHeaderProps<TData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return <calendar.h3 {...calendarProps_merge(part('list-day-header'), rest)} state={local.day} />;
};

type ListViewEventProps<TData> = { event: Calendar_Event<TData> } & Calendar_HTMLProps<'button', Calendar_Event<TData>>;

export const ListViewEvent = <TData,>(props: ListViewEventProps<TData>) => {
  const [local, rest] = splitProps(props, ['event']);

  return (
    <calendar.button {...calendarProps_merge({ type: 'button', ...part('list-event') }, rest)} state={local.event} />
  );
};

/** Renders only when the list has no days (D18). */
export const ListViewEmpty = (props: Calendar_HTMLProps<'div'>) => {
  const model = useContext(ListViewContext);

  return (
    <Show when={!model || model().days.length === 0}>
      <calendar.div {...calendarProps_merge(part('list-empty'), props)} />
    </Show>
  );
};
