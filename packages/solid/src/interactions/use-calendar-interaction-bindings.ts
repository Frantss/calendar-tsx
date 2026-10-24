import type { Accessor } from 'solid-js';
import type { Calendar_LayoutProjection, Calendar_DomBindings, Calendar_DomOptions } from '@calendar-tsx/core';
import { onMount, onCleanup } from 'solid-js';
import { useSelector } from '@tanstack/solid-store';
import { createCalendarInteractionBindings } from '@calendar-tsx/core';
import type { Calendar_EventDomCalendar } from '@calendar-tsx/core';
export const useCalendarInteractionBindings = <D>(
  calendar: Calendar_EventDomCalendar<D>,
  options: Calendar_DomOptions = {},
): Calendar_DomBindings & { preview: Accessor<Calendar_LayoutProjection | null> } => {
  const bindings = createCalendarInteractionBindings(calendar, options);
  onMount(() => onCleanup(bindings.mount()));
  const preview = useSelector(calendar.api.interactions.store, state => state.preview);
  const { mount: _mount, ...refs } = bindings;
  return { ...refs, preview };
};
