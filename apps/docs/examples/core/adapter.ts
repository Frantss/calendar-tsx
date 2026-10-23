import type {
  Calendar_Features,
  Calendar_Instance,
  Calendar_Options,
  Calendar_ValidateFeatures,
  Calendar_Views,
} from '@calendar-tsx/core';
import { createCalendar } from '@calendar-tsx/core';

// #region adapter
// the shape of a framework binding: create once, sync options on every render, mount with the component
export const bindCalendar = <TData, TResourceData, TViews extends Calendar_Views, TFeatures extends Calendar_Features>(
  // intersect the validation, as the bindings do, so missing features stay a type error for your users
  initial: Calendar_Options<TData, TResourceData, TViews, TFeatures> & Calendar_ValidateFeatures<TViews, TFeatures>,
  onChange: () => void,
) => {
  const calendar: Calendar_Instance<TData, TResourceData, TViews, TFeatures> = createCalendar(initial);

  return {
    calendar,
    /** On every render, with the current options; writes only when a tracked option changed. */
    update: (options: Calendar_Options<TData, TResourceData, TViews, TFeatures>) => calendar['~update'](options),
    /** When the component mounts: start the clock and listen to the store. Returns the cleanup. */
    mount: () => {
      const unmount = calendar['~mount']();
      const subscription = calendar.store.subscribe(onChange);

      return () => {
        subscription.unsubscribe();
        unmount();
      };
    },
  };
};
// #endregion adapter
