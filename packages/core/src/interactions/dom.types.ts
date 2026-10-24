import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_InteractionControls, Calendar_InteractionStart } from '#features/interaction/interaction.types';
import type { Calendar_MoveApi } from '#features/event-move/event-move.types';
import type { Calendar_ResizeApi } from '#features/event-resize/event-resize.types';
import type { Calendar_SelectionApi } from '#features/date-selection/date-selection.types';
import type { Calendar_PointerApi } from '#features/pointer/pointer.types';
import type { Calendar_LayoutPoint, Calendar_LayoutLocation } from '#layouts/interaction.types';
import type { Calendar_CrossCalendarApi, Calendar_TransferApi } from '#features/cross-calendar/cross-calendar.types';
import type { Calendar_ExternalDropApi } from '#features/external-drop/external-drop.types';

export type Calendar_DomCalendar<D = unknown> = {
  readonly options: {
    timeZone: string;
    events: readonly ({ id: string; '~source'?: string } | Calendar_EventInput<D>)[];
  };
  api: {
    pointer: Calendar_PointerApi;
    interactions: Calendar_InteractionControls;
    selection?: Calendar_SelectionApi;
    move?: Calendar_MoveApi<D>;
    resize?: Calendar_ResizeApi<D>;
    externalDrop?: Calendar_ExternalDropApi<D>;
    crossCalendar?: Calendar_CrossCalendarApi<D>;
    transfer?: Calendar_TransferApi<D>;
  };
};

export type Calendar_DomPosition = { x: number; y: number; bounds: DOMRect; event: PointerEvent };

export type Calendar_DomGesture = { kind?: 'timed' | 'allDay'; offset?: string; time?: string; edge?: 'start' | 'end' };

export type Calendar_DomSurface = {
  key: string;
  point: (position: Calendar_DomPosition, gesture: Calendar_DomGesture) => Calendar_LayoutPoint;
};

export type Calendar_DomSource = { eventId: string; edge?: 'start' | 'end'; resourceId?: string };

export type Calendar_DomOperation = {
  begin: (target: unknown) => Calendar_InteractionStart;
  target?: (target: unknown, anchor: unknown) => unknown;
};

export type Calendar_DomHost<D = unknown> = {
  calendar: Calendar_DomCalendar<D>;
  root: () => HTMLElement | undefined;
  hit: (
    element: Element,
    event: PointerEvent,
    gesture: Calendar_DomGesture,
  ) => { location: Calendar_LayoutLocation; surface: HTMLElement } | undefined;
  surface: (element: HTMLElement, descriptor: Calendar_DomSurface) => () => void;
  source: (element: HTMLElement, descriptor: Calendar_DomSource | Calendar_DomOperation) => () => void;
  cancel: () => void;
  mount: (element: HTMLElement) => () => void;
  destroy: () => void;
};
