import { resolveDomOperation } from '#interactions/dom-operation';
import type { Calendar_EventInput } from '#events/event.types';
import type {
  Calendar_EventDomCalendar,
  Calendar_DomCalendar,
  Calendar_DomSurface,
  Calendar_DomSource,
  Calendar_DomOperation,
  Calendar_DomHost,
  Calendar_DomOptions,
  Calendar_ExternalDragOptions,
} from '#interactions/dom.types';
import { createDomHost, createDomDraggable, createCalendarDragScope } from '#interactions/dom-host';
import { eventBinding, receiveEvent } from '#interactions/event-bindings';

export const timeGridSurface = (key?: string): Calendar_DomSurface => ({
  key: key ? `column:${key}` : 'allDay',
  point: ({ x, y }, gesture) => ({
    kind: 'timeGrid',
    surface: key ? { kind: 'column', key } : { kind: 'allDay' },
    fraction: key ? y : x,
    offset: gesture.offset,
    edge: gesture.edge,
  }),
});

export const timelineSurface = (key: string, dateKind: 'timed' | 'allDay' = 'timed'): Calendar_DomSurface => ({
  key: `lane:${key}`,
  point: ({ x }, gesture) => ({
    kind: 'timeline',
    surface: { kind: 'lane', key },
    fraction: x,
    dateKind: gesture.kind ?? dateKind,
    offset: gesture.offset,
    edge: gesture.edge,
  }),
});

export const dayGridSurface = (section: string, row: string): Calendar_DomSurface => ({
  key: `row:${section}:${row}`,
  point: ({ x }, gesture) => ({
    kind: 'dayGrid',
    surface: { kind: 'row', section, row },
    fraction: x,
    dateKind: gesture.kind,
    time: gesture.time,
    offset: gesture.offset,
    edge: gesture.edge,
  }),
});

export const createCalendarInteractionHost = <D>(
  calendar: Calendar_EventDomCalendar<D>,
  options: Calendar_DomOptions = {},
): Calendar_DomHost => {
  const host = createDomHost(
    calendar,
    options.dragScope ?? createCalendarDragScope(),
    () => (options.selection ? eventBinding(calendar, options.selection) : eventBinding(calendar)),
    data => receiveEvent(calendar, data),
  );
  return {
    surface: host.surface,
    cancel: host.cancel,
    mount: host.mount,
    destroy: host.destroy,
    source: (element, descriptor) => host.source(element, () => eventBinding(calendar, descriptor)),
  };
};

export const createCalendarDomHost = (calendar: Calendar_DomCalendar, options: Calendar_DomOptions = {}) => {
  const host = createDomHost(
    calendar,
    options.dragScope ?? createCalendarDragScope(),
    () => (options.selection ? resolveDomOperation(options.selection) : undefined),
    () => undefined,
  );
  return {
    surface: host.surface,
    cancel: host.cancel,
    mount: host.mount,
    destroy: host.destroy,
    source: (element: HTMLElement, operation: Calendar_DomOperation) =>
      host.source(element, () => resolveDomOperation(operation)),
  };
};

export const createExternalDraggable = <D>(
  element: HTMLElement,
  getSource: () => { event: Calendar_EventInput<D>; metadata?: unknown },
  options: Calendar_ExternalDragOptions,
) =>
  createDomDraggable(
    element,
    () => {
      const source = getSource();
      return { data: { kind: 'create', ...source }, gesture: { kind: source.event.kind } };
    },
    options,
  );

export const createCalendarInteractionBindings = <D>(
  calendar: Calendar_EventDomCalendar<D>,
  options: Calendar_DomOptions = {},
) => {
  const host = createCalendarInteractionHost(calendar, options);
  let root: HTMLElement | null = null;
  let mounted = false;
  let release: (() => void) | undefined;
  const refs = new Map<
    string,
    {
      descriptor: Calendar_DomSurface | Calendar_DomSource | Calendar_DomOperation;
      ref: (element: HTMLElement | null) => void;
    }
  >();
  const register = (
    key: string,
    descriptor: Calendar_DomSurface | Calendar_DomSource | Calendar_DomOperation,
    surface: boolean,
  ) => {
    const previous = refs.get(key);
    if (previous) {
      previous.descriptor = descriptor;
      return previous.ref;
    }
    let cleanup: (() => void) | undefined;
    let current: HTMLElement | null = null;
    const entry = {
      descriptor,
      ref: (element: HTMLElement | null) => {
        if (element === current) return;
        cleanup?.();
        current = element;
        if (element)
          cleanup = surface
            ? host.surface(element, {
                key: (entry.descriptor as Calendar_DomSurface).key,
                point: (...args) => (entry.descriptor as Calendar_DomSurface).point(...args),
              })
            : host.source(
                element,
                new Proxy({} as Calendar_DomSource | Calendar_DomOperation, {
                  get: (_target, property) => Reflect.get(entry.descriptor, property),
                  has: (_target, property) => property in entry.descriptor,
                }),
              );
      },
    };
    refs.set(key, entry);
    return entry.ref;
  };
  return {
    root: (element: HTMLElement | null) => {
      if (root === element) return;
      release?.();
      root = element;
      if (mounted && root) release = host.mount(root);
    },
    surface: (descriptor: Calendar_DomSurface) => register(`surface:${descriptor.key}`, descriptor, true),
    source: (key: string, descriptor: Calendar_DomSource) => register(`source:${key}`, descriptor, false),
    operation: (key: string, descriptor: Calendar_DomOperation) => register(`operation:${key}`, descriptor, false),
    cancel: () => host.cancel(),
    mount: () => {
      mounted = true;
      if (root) release = host.mount(root);
      return () => {
        mounted = false;
        release?.();
        release = undefined;
      };
    },
  };
};
