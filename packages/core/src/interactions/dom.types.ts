import type { Calendar_EventInput } from '#events/event.types';
import type {
  Calendar_InteractionControls,
  Calendar_InteractionStart,
  Calendar_OperationKind,
  Calendar_OperationTarget,
} from '#features/interaction/interaction.types';
import type { Calendar_MoveApi } from '#features/event-move/event-move.types';
import type { Calendar_ResizeApi } from '#features/event-resize/event-resize.types';
import type { Calendar_SelectionApi } from '#features/date-selection/date-selection.types';
import type { Calendar_PointerApi } from '#features/pointer/pointer.types';
import type { Calendar_LayoutPoint } from '#layouts/interaction.types';
import type { Calendar_TransferApi } from '#features/event-transfer/event-transfer.types';
import type { Calendar_ExternalDropApi } from '#features/external-drop/external-drop.types';

export type Calendar_EventDomCalendar<D = unknown> = Calendar_DomCalendar & {
  readonly options: {
    timeZone: string;
    events: readonly ({ id: string; '~source'?: string } | Calendar_EventInput<D>)[];
  };
  api: {
    selection?: Calendar_SelectionApi;
    move?: Calendar_MoveApi<D>;
    resize?: Calendar_ResizeApi<D>;
    externalDrop?: Calendar_ExternalDropApi<D>;
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
  [K in Calendar_OperationKind]: Calendar_DomOperationSpec<K>;
}[Calendar_OperationKind];

export type Calendar_DomOperationSpec<K extends Calendar_OperationKind> = {
  acceptsTarget: (target: unknown) => target is Calendar_OperationTarget<K>;
  begin: (anchor: Calendar_OperationTarget<K>) => Calendar_InteractionStart<K>;
  target?: (target: unknown, anchor: unknown) => Calendar_OperationTarget<K> | undefined;
};

export type Calendar_DomCalendar = {
  api: { pointer: Calendar_PointerApi; interactions: Calendar_InteractionControls };
};
export type Calendar_DragScope = { readonly '~dragScope': true };
export type Calendar_DomOptions = { dragScope?: Calendar_DragScope; selection?: Calendar_DomOperation };
export type Calendar_ExternalDragOptions = import('#features/pointer/pointer.types').Calendar_InputSettings & {
  dragScope: Calendar_DragScope;
};

export type Calendar_DomHost = {
  surface: (element: HTMLElement, descriptor: Calendar_DomSurface) => () => void;
  source: (element: HTMLElement, descriptor: Calendar_DomSource | Calendar_DomOperation) => () => void;
  cancel: () => void;
  mount: (element: HTMLElement) => () => void;
  destroy: () => void;
};

export type Calendar_DomBindings = {
  root: (element: HTMLElement | null) => void;
  surface: (descriptor: Calendar_DomSurface) => (element: HTMLElement | null) => void;
  source: (key: string, descriptor: Calendar_DomSource) => (element: HTMLElement | null) => void;
  operation: (key: string, descriptor: Calendar_DomOperation) => (element: HTMLElement | null) => void;
  cancel: () => void;
};
