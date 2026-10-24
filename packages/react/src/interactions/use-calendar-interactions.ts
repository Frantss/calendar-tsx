import type { Calendar_LayoutProjection } from '@calendar-tsx/core';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useSelector } from '@tanstack/react-store';
import { createCalendarInteractionBindings } from '@calendar-tsx/core';
import type { Calendar_DomCalendar } from '@calendar-tsx/core';
const useMountedEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
export const useCalendarInteractions = <D>(
  calendar: Calendar_DomCalendar<D>,
): ReturnType<typeof createCalendarInteractionBindings> & { preview: Calendar_LayoutProjection | null } => {
  const bindings = useMemo(() => createCalendarInteractionBindings(calendar), [calendar]);
  useMountedEffect(bindings.mount, [bindings]);
  const preview = useSelector(calendar.api.interactions.store, state => state.preview);
  return { ...bindings, preview };
};
