import { useSelector } from '@tanstack/react-store';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

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

const CalendarContext = createContext<{ instance: AnyInstance; locale: string } | null>(null);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Creates the instance once, mounts it once, and pushes every render's options through `~update`,
 * which writes the store only when a tracked input changed (D24, after oxform's `useForm`).
 */
export const useCalendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_Features = Calendar_Features,
>(
  options: Calendar_Options<TData, TResourceData, TViews, TFeatures> & Calendar_ValidateFeatures<TViews, TFeatures>,
) => {
  const [instance] = useState(() => createCalendar<TData, TResourceData, TViews, TFeatures>(options));

  useIsomorphicLayoutEffect(instance['~mount'], [instance]);
  useIsomorphicLayoutEffect(() => {
    instance['~update'](options);
  });

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

export const CalendarProvider = ({
  value,
  locale = 'en-US',
  children,
}: {
  value: AnyInstance;
  /** Locale for the parts' default accessible labels (D20). */
  locale?: string;
  children: ReactNode;
}) => {
  // stable value: consumers re-render on store changes through selectors, not on every parent render
  const context = useMemo(() => ({ instance: value, locale }), [value, locale]);

  return <CalendarContext.Provider value={context}>{children}</CalendarContext.Provider>;
};

export const Calendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_Features = Calendar_Features,
>({
  children,
  ...options
}: Calendar_Options<TData, TResourceData, TViews, TFeatures> &
  Calendar_ValidateFeatures<TViews, TFeatures> & { children: ReactNode }) => {
  const instance = useCalendar<TData, TResourceData, TViews, TFeatures>(
    options as Calendar_Options<TData, TResourceData, TViews, TFeatures> & Calendar_ValidateFeatures<TViews, TFeatures>,
  );

  return (
    <CalendarProvider value={instance} locale={options.locale}>
      {children}
    </CalendarProvider>
  );
};
