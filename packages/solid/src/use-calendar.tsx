import { useSelector } from '@tanstack/solid-store';
import type { Accessor, JSX } from 'solid-js';
import { createContext, createRenderEffect, onCleanup, onMount, splitProps, untrack, useContext } from 'solid-js';

import type {
  Calendar_Features,
  Calendar_Instance,
  Calendar_Options,
  Calendar_State,
  Calendar_ValidateFeatures,
  Calendar_Views,
} from '@calendar-tsx/core';
import { createCalendar } from '@calendar-tsx/core';

/** Any instance: the parts only navigate and read the store, so view keys and feature types are erased. */
type AnyInstance = {
  readonly options: unknown;
  store: Calendar_Instance<unknown, unknown, Calendar_Views>['store'];
  api: Pick<Calendar_Instance<unknown, unknown, Calendar_Views>['api'], 'navigate'>;
  '~mount': () => () => void;
  '~update': (options: never) => void;
};

const CalendarContext = createContext<{ readonly instance: AnyInstance; readonly locale: string }>();

/**
 * Creates the instance once, mounts it with the owner, and pushes the options through `~update`
 * whenever a signal they read changes; `~update` writes the store only when a tracked input
 * changed (D24, D31).
 */
export const useCalendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_Features = Calendar_Features,
>(
  options: Accessor<
    Calendar_Options<TData, TResourceData, TViews, TFeatures> & Calendar_ValidateFeatures<TViews, TFeatures>
  >,
) => {
  const instance = createCalendar<TData, TResourceData, TViews, TFeatures>(untrack(options));

  onMount(() => onCleanup(instance['~mount']()));
  createRenderEffect(() => instance['~update'](options()));

  return instance;
};

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);

  if (!context) throw new Error('[calendar] parts must be rendered inside Calendar or CalendarProvider');

  return context;
};

/**
 * Context loses the instance's types; annotate the selector to get them back:
 * `useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => state.layout)` (D29).
 */
export const useCalendarSelector = <TState = Calendar_State<unknown, unknown, Calendar_Views>, TSelected = unknown>(
  selector: (state: TState) => TSelected,
) => {
  const { instance } = useCalendarContext();

  return useSelector(instance.store, state => selector(state as TState));
};

export const CalendarProvider = (props: {
  value: AnyInstance;
  /** Locale for the parts' default accessible labels (D20). */
  locale?: string | undefined;
  children: JSX.Element;
}) => {
  // getters: consumers read the current value, and re-run through selectors rather than through the context
  const context = {
    get instance() {
      return props.value;
    },
    get locale() {
      return props.locale ?? 'en-US';
    },
  };

  return <CalendarContext.Provider value={context}>{props.children}</CalendarContext.Provider>;
};

export const Calendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_Features = Calendar_Features,
>(
  props: Calendar_Options<TData, TResourceData, TViews, TFeatures> &
    Calendar_ValidateFeatures<TViews, TFeatures> & { children: JSX.Element },
) => {
  const [local, options] = splitProps(props, ['children']);
  const instance = useCalendar<TData, TResourceData, TViews, TFeatures>(
    () =>
      ({ ...options }) as Calendar_Options<TData, TResourceData, TViews, TFeatures> &
        Calendar_ValidateFeatures<TViews, TFeatures>,
  );

  return (
    <CalendarProvider value={instance} locale={options.locale}>
      {local.children}
    </CalendarProvider>
  );
};
