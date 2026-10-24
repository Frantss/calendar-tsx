import type {
  ListViewProps,
  SectionProps,
  SectionHeaderProps,
  ListViewDayProps,
  ListViewDayHeaderProps,
  ListViewEventProps,
} from '#views/list/list-view.types';
import type { Accessor } from 'solid-js';
import { Show, createContext, splitProps, useContext } from 'solid-js';

import type { Calendar_ListLayout } from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#rendering/rendering.types';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#rendering/factory';
import { calendarParts_attributes as part, calendarParts_vars as vars } from '#views/shared/parts';

const ListViewContext = createContext<Accessor<Calendar_ListLayout<unknown>>>();

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

export const ListViewSectionHeader = <TData, TResourceData>(props: SectionHeaderProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['section']);
  return <calendar.h2 {...calendarProps_merge(part('list-section-header'), rest)} state={local.section} />;
};

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

export const ListViewDayHeader = <TData, TResourceData>(props: ListViewDayHeaderProps<TData, TResourceData>) => {
  const [local, rest] = splitProps(props, ['day']);

  return <calendar.h3 {...calendarProps_merge(part('list-day-header'), rest)} state={local.day} />;
};

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
