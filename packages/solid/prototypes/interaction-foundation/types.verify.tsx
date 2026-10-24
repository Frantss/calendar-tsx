import type { ComponentProps } from 'solid-js';
import { CalendarProvider, useCalendar } from '@calendar-tsx/solid';
import { createCalendarViews, listView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import type {} from '../../../core/prototypes/interaction-foundation/feature-types';

const views = createCalendarViews({ list: listView({ days: 1 }) });
export const DisplayOnlyTypingProbe = () => {
  const calendar = useCalendar(() => ({
    ...views,
    view: 'list',
    date: Temporal.PlainDate.from('2026-10-23'),
    timeZone: 'UTC',
    events: [],
    onNavigate: () => {},
  }));
  const props: ComponentProps<typeof CalendarProvider> = {
    // @ts-expect-error known adapter gap: erased context requires an unregistered selection slice
    value: calendar,
    children: null,
  };
  void props;
  return null;
};
