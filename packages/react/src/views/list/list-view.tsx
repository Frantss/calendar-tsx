import type {
  ListViewProps,
  SectionProps,
  SectionHeaderProps,
  ListViewDayProps,
  ListViewDayHeaderProps,
  ListViewEventProps,
} from '#views/list/list-view.types';
import type { ReactElement, RefAttributes } from 'react';
import { createContext, forwardRef, useContext } from 'react';

import type { Calendar_ListLayout } from '@calendar-tsx/core';
import type { Calendar_HTMLProps } from '#rendering/rendering.types';
import { calendarFactory_elements as calendar, calendarProps_merge } from '#rendering/factory';
import { calendarParts_attributes as part, calendarParts_vars as vars } from '#views/shared/parts';

const ListViewContext = createContext<Calendar_ListLayout<unknown> | null>(null);

export const ListView = forwardRef<HTMLDivElement, ListViewProps<unknown, unknown>>(({ model, ...props }, ref) => (
  <ListViewContext.Provider value={model}>
    <calendar.div
      {...calendarProps_merge({ role: 'region', 'aria-label': 'Event list', ...part('list-root') }, props)}
      state={model}
      ref={ref}
    />
  </ListViewContext.Provider>
)) as <TData, TResourceData>(
  props: ListViewProps<TData, TResourceData> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

export const ListViewSection = forwardRef<HTMLElement, SectionProps<unknown, unknown>>(({ section, ...props }, ref) => (
  <calendar.section
    {...calendarProps_merge(
      {
        'data-date': section.date?.toString(),
        'data-resource-id': section.resource?.id,
        ...part('list-section'),
      },
      props,
    )}
    state={section}
    ref={ref}
  />
)) as <TData, TResourceData>(
  props: SectionProps<TData, TResourceData> & RefAttributes<HTMLElement>,
) => ReactElement | null;

export const ListViewSectionHeader = forwardRef<HTMLHeadingElement, SectionHeaderProps<unknown, unknown>>(
  ({ section, ...props }, ref) => (
    <calendar.h2 {...calendarProps_merge(part('list-section-header'), props)} state={section} ref={ref} />
  ),
) as <TData, TResourceData>(
  props: SectionHeaderProps<TData, TResourceData> & RefAttributes<HTMLHeadingElement>,
) => ReactElement | null;

export const ListViewDay = forwardRef<HTMLElement, ListViewDayProps<unknown, unknown>>(({ day, ...props }, ref) => (
  <calendar.section
    {...calendarProps_merge(
      {
        'data-date': day.date.toString(),
        'data-resource-id': day.resource?.id,
        style: vars({ events: Math.max(1, day.events.length) }),
        ...part('list-day'),
      },
      props,
    )}
    state={day}
    ref={ref}
  />
)) as <TData, TResourceData>(
  props: ListViewDayProps<TData, TResourceData> & RefAttributes<HTMLElement>,
) => ReactElement | null;

export const ListViewDayHeader = forwardRef<HTMLHeadingElement, ListViewDayHeaderProps<unknown, unknown>>(
  ({ day, ...props }, ref) => (
    <calendar.h3 {...calendarProps_merge(part('list-day-header'), props)} state={day} ref={ref} />
  ),
) as <TData, TResourceData>(
  props: ListViewDayHeaderProps<TData, TResourceData> & RefAttributes<HTMLHeadingElement>,
) => ReactElement | null;

export const ListViewEvent = forwardRef<HTMLButtonElement, ListViewEventProps<unknown>>(({ event, ...props }, ref) => (
  <calendar.button {...calendarProps_merge({ type: 'button', ...part('list-event') }, props)} state={event} ref={ref} />
)) as <TData>(props: ListViewEventProps<TData> & RefAttributes<HTMLButtonElement>) => ReactElement | null;

/** Renders only when the list has no days (D18). */
export const ListViewEmpty = forwardRef<HTMLDivElement, Calendar_HTMLProps<'div'>>((props, ref) => {
  const model = useContext(ListViewContext);

  if (model && model.days.length > 0) return null;

  return <calendar.div {...calendarProps_merge(part('list-empty'), props)} ref={ref} />;
});
