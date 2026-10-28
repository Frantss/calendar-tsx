import type { Accessor } from 'solid-js';
import { onSettled } from 'solid-js';
import type {
  Calendar_LayoutProjection,
  Calendar_DomBindings,
  Calendar_DomOptions,
  Calendar_EventDomCalendar,
} from '@calendar-tsx/core';
import { createCalendarInteractionBindings } from '@calendar-tsx/core';
import { useSelector } from './store';

export const useCalendarInteractionBindings = <D>(
  calendar: Calendar_EventDomCalendar<D>,
  options: Calendar_DomOptions = {},
): Calendar_DomBindings & { preview: Accessor<Calendar_LayoutProjection | null> } => {
  const bindings = createCalendarInteractionBindings(calendar, options);
  onSettled(() => bindings.mount());
  const preview = useSelector(calendar.api.interactions.store, state => state.preview);
  const { mount: _mount, ...refs } = bindings;
  return { ...refs, preview };
};
