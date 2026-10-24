import type { Calendar_LayoutLocation } from '#layouts/interaction.types';
import type { Calendar_InteractionResult } from '#features/interaction/interaction.types';
import type { Calendar_DomCalendar, Calendar_DomGesture, Calendar_DomSurface } from '#interactions/dom.types';

export type DomSession = {
  update: (target: unknown) => Calendar_InteractionResult<unknown>;
  commit: () => Calendar_InteractionResult<unknown>;
  cancel: (reason?: string) => Calendar_InteractionResult<unknown>;
  unavailable: (reason: string) => Calendar_InteractionResult<unknown>;
  isActive: () => boolean;
};
export type DomStart =
  | { status: 'active'; session: DomSession }
  | { status: 'busy' | 'awaiting-owner' | 'unavailable' };
export type DomTransfer = { data: unknown; valid: () => boolean; release: () => void };
export type DomBinding = {
  gesture?: Calendar_DomGesture;
  anchor?: (location: Calendar_LayoutLocation) => unknown;
  begin: (anchor: unknown) => DomStart | undefined;
  target?: (target: unknown, anchor: unknown) => unknown;
  transfer?: () => DomTransfer | undefined;
};
export type DomHost = {
  calendar: Calendar_DomCalendar;
  root: () => HTMLElement | undefined;
  hit: (
    element: Element,
    event: PointerEvent,
    gesture: Calendar_DomGesture,
  ) => { location: Calendar_LayoutLocation; surface: HTMLElement } | undefined;
  receive: (data: unknown) => DomStart | undefined;
  surface: (element: HTMLElement, descriptor: Calendar_DomSurface) => () => void;
  source: (element: HTMLElement, resolve: () => DomBinding | undefined) => () => void;
  cancel: () => void;
  mount: (root: HTMLElement) => () => void;
  destroy: () => void;
};
