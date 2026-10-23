import { useSelector } from '@tanstack/react-store';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import type { Calendar_Instance, Calendar_Options, Calendar_State, Calendar_Views } from '@calendar-tsx/core';
import { calendar_create } from '@calendar-tsx/core';

type AnyInstance = Calendar_Instance<any, any, any>;

const CalendarContext = createContext<{ instance: AnyInstance; locale: string } | null>(null);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Creates the instance once, mounts it once, and pushes every render's options through `~update`,
 * which writes the store only when a tracked input changed (D24, after oxform's `useForm`).
 */
export const useCalendar = <TData, TResourceData = unknown, TViews extends Calendar_Views = Calendar_Views>(
  options: Calendar_Options<TData, TResourceData, TViews>,
) => {
  const [instance] = useState(() => calendar_create(options));

  useIsomorphicLayoutEffect(instance['~mount'], [instance]);
  useIsomorphicLayoutEffect(() => {
    instance['~update'](options);
  });

  return instance;
};

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);

  if (!context) throw new Error('[calendar] parts must be rendered inside Calendar_Root or Calendar_RootProvider');

  return context;
};

export const useCalendarSelector = <
  TSelected,
  TData = unknown,
  TResourceData = unknown,
  TViews extends Calendar_Views = Calendar_Views,
>(
  selector: (state: Calendar_State<TData, TResourceData, TViews>) => TSelected,
) => {
  const { instance } = useCalendarContext();

  return useSelector(instance.store as Calendar_Instance<TData, TResourceData, TViews>['store'], selector);
};

export const Calendar_RootProvider = ({
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

export const Calendar_Root = <TData, TResourceData = unknown, TViews extends Calendar_Views = Calendar_Views>({
  children,
  ...options
}: Calendar_Options<TData, TResourceData, TViews> & { children: ReactNode }) => {
  const instance = useCalendar(options);

  return (
    <Calendar_RootProvider value={instance} locale={options.locale}>
      {children}
    </Calendar_RootProvider>
  );
};
