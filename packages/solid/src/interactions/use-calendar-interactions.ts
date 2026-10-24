import type { Accessor } from 'solid-js';
import type { Calendar_LayoutProjection } from '@calendar-tsx/core';
import { onMount, onCleanup } from 'solid-js';
import { useSelector } from '@tanstack/solid-store';
import { createCalendarInteractionBindings } from '@calendar-tsx/core';
import type { Calendar_DomCalendar } from '@calendar-tsx/core';
export const useCalendarInteractions = <D>(
  calendar: Calendar_DomCalendar<D>,
): ReturnType<typeof createCalendarInteractionBindings> & { preview: Accessor<Calendar_LayoutProjection | null> } => {
  const bindings = createCalendarInteractionBindings(calendar);
  onMount(() => onCleanup(bindings.mount()));
  const preview = useSelector(calendar.api.interactions.store, state => state.preview);
  return { ...bindings, preview };
};
