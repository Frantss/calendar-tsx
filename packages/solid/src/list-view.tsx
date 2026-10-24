import type { Accessor } from 'solid-js';
import { Show, createContext, splitProps, useContext } from 'solid-js';

import type { Calendar_Event, Calendar_ListDay, Calendar_ListLayout, Calendar_ListSection } from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#calendar-factory';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#calendar-factory';
import { calendarParts_attributes as part, calendarParts_vars as vars } from '#calendar-parts';

const ListViewContext = createContext<Accessor<Calendar_ListLayout<unknown>>>();

type ListViewProps<TData, TResourceData> = { model: Calendar_ListLayout<TData, TResourceData> } & Calendar_HTMLProps<
  'div',
  Calendar_ListLayout<TData, TResourceData>
>;

export const ListView = <TData, TResourceData>(props: ListViewProps<TData, TResourceData>) => {
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

type SectionProps<TData, TResourceData> = { section: Calendar_ListSection<TData, TResourceData> } & Calendar_HTMLProps<
  'section',
  Calendar_ListSection<TData, TResourceData>
>;

export const ListViewSection = <TData, TResourceData>(props: SectionProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['section']);
  return (
    <calendar.section
      {...calendarProps_merge(
        () => ({
          'data-date': local.section.date?.toString(),
          'data-resource-id': local.section.resource?.id,
          ...part('list-section'),
        }),
        rest,
      )}
      state={local.section}
    />
  );
};

type SectionHeaderProps<TData, TResourceData> = {
  section: Calendar_ListSection<TData, TResourceData>;
} & Calendar_HTMLProps<'h2', Calendar_ListSection<TData, TResourceData>>;

export const ListViewSectionHeader = <TData, TResourceData>(props: SectionHeaderProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['section']);
  return <calendar.h2 {...calendarProps_merge(part('list-section-header'), rest)} state={local.section} />;
};

type DayProps<TData, TResourceData> = { day: Calendar_ListDay<TData, TResourceData> };

type ListViewDayProps<TData, TResourceData> = DayProps<TData, TResourceData> &
  Calendar_HTMLProps<'section', Calendar_ListDay<TData, TResourceData>>;

export const ListViewDay = <TData, TResourceData>(props: ListViewDayProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return (
    <calendar.section
      {...calendarProps_merge(
        () => ({
          'data-date': local.day.date.toString(),
          'data-resource-id': local.day.resource?.id,
          style: vars({ events: Math.max(1, local.day.events.length) }),
          ...part('list-day'),
        }),
        rest,
      )}
      state={local.day}
    />
  );
};

type ListViewDayHeaderProps<TData, TResourceData> = DayProps<TData, TResourceData> &
  Calendar_HTMLProps<'h3', Calendar_ListDay<TData, TResourceData>>;

export const ListViewDayHeader = <TData, TResourceData>(props: ListViewDayHeaderProps<TData, TResourceData>) => {
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
