import type { Calendar_LayoutProjection, Calendar_DomBindings, Calendar_DomOptions } from '@calendar-tsx/core';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useSelector } from '@tanstack/react-store';
import { createCalendarInteractionBindings } from '@calendar-tsx/core';
import type { Calendar_EventDomCalendar } from '@calendar-tsx/core';
const useMountedEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
export const useCalendarInteractionBindings = <D>(
  calendar: Calendar_EventDomCalendar<D>,
  options: Calendar_DomOptions = {},
): Calendar_DomBindings & { preview: Calendar_LayoutProjection | null } => {
  const { dragScope, selection } = options;
  const bindings = useMemo(
    () => createCalendarInteractionBindings(calendar, { dragScope, selection }),
    [calendar, dragScope, selection],
  );
  useMountedEffect(bindings.mount, [bindings]);
  const preview = useSelector(calendar.api.interactions.store, state => state.preview);
  const { mount: _mount, ...refs } = bindings;
  return { ...refs, preview };
};
