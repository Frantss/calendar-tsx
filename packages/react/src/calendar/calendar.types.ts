import type { Calendar_Views, Calendar_ViewContext, Calendar_AnyLayout, Calendar_Api } from '@calendar-tsx/core';
import type { ReadonlyStore } from '@tanstack/store';
import type { Temporal } from 'temporal-polyfill';

/** Any instance: the parts only navigate and read the store, so view keys and feature types are erased. */
export type AnyInstance = {
  readonly options: { views: Calendar_Views };
  store: ReadonlyStore<{
    context: Calendar_ViewContext<Calendar_Views>;
    layout: Calendar_AnyLayout;
    now: Temporal.ZonedDateTime;
  }>;
  api: Pick<Calendar_Api<Calendar_Views, {}>, 'navigate'>;
  '~mount': () => () => void;
  '~update': (options: never) => void;
};
