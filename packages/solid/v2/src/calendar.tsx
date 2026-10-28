import type { Accessor } from 'solid-js';
import { createContext, createRenderEffect, omit, onSettled, untrack, useContext } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type {
  Calendar_ConfiguredFeatures,
  Calendar_Options,
  Calendar_State,
  Calendar_ValidateFeatures,
  Calendar_Views,
} from '@calendar-tsx/core';
import { createCalendar } from '@calendar-tsx/core';
import type { AnyInstance } from '../../src/calendar/calendar.types';
import { useSelector } from './store';

const CalendarContext = createContext<{ readonly instance: AnyInstance; readonly locale: string } | null>(null);

export const useCalendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_ConfiguredFeatures = Calendar_ConfiguredFeatures,
>(
  options: Accessor<
    Calendar_Options<TData, TResourceData, TViews, TFeatures> &
      Calendar_ValidateFeatures<NoInfer<TViews>, NoInfer<TFeatures>> & { locale?: never }
  >,
) => {
  const instance = createCalendar<TData, TResourceData, TViews, TFeatures>(untrack(options));
  createRenderEffect(options, value => instance['~update'](value));
  onSettled(() => instance['~mount']());
  return instance;
};

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (!context) throw new Error('[calendar] parts must be rendered inside Calendar or CalendarProvider');
  return context;
};

export const useCalendarSelector = <TState = Calendar_State<unknown, unknown, Calendar_Views>, TSelected = unknown>(
  selector: (state: TState) => TSelected,
) => {
  const instance = untrack(() => useCalendarContext().instance);
  return useSelector(instance.store, state => selector(state as TState));
};

export const CalendarProvider = (props: { value: AnyInstance; locale?: string | undefined; children: JSX.Element }) => {
  const context = {
    get instance() {
      return props.value;
    },
    get locale() {
      return props.locale ?? 'en-US';
    },
  };
  return <CalendarContext value={context}>{props.children}</CalendarContext>;
};

export const Calendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_ConfiguredFeatures = Calendar_ConfiguredFeatures,
>(
  props: Calendar_Options<TData, TResourceData, TViews, TFeatures> &
    Calendar_ValidateFeatures<NoInfer<TViews>, NoInfer<TFeatures>> & { children: JSX.Element; locale?: string },
) => {
  const options = omit(props, 'children', 'locale');
  const instance = useCalendar<TData, TResourceData, TViews, TFeatures>(
    () =>
      ({ ...options }) as Calendar_Options<TData, TResourceData, TViews, TFeatures> &
        Calendar_ValidateFeatures<NoInfer<TViews>, NoInfer<TFeatures>>,
  );
  return (
    <CalendarProvider value={instance} locale={props.locale}>
      {props.children}
    </CalendarProvider>
  );
};
