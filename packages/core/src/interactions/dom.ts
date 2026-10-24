import { Temporal } from 'temporal-polyfill';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_InteractionControls, Calendar_InteractionStart } from '#features/interaction/interaction.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type { Calendar_TransferSource } from '#features/cross-calendar/cross-calendar.types';
import type {
  Calendar_DomCalendar,
  Calendar_DomGesture,
  Calendar_DomSurface,
  Calendar_DomSource,
  Calendar_DomOperation,
  Calendar_DomHost,
} from '#interactions/dom.types';

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

const isDate = (target: unknown): target is Calendar_DateTarget =>
  !!target &&
  typeof target === 'object' &&
  'kind' in target &&
  'at' in target &&
  (target.kind === 'timed' || target.kind === 'allDay');

type Host = Calendar_DomHost<any>;

const hosts = new Set<Host>();

const cancellations = new Map<Host, Set<() => void>>();

const cancelHost = (host: Host) => {
  for (const cancel of cancellations.get(host) ?? []) cancel();
};

const eventOf = <D>(calendar: Calendar_DomCalendar<D>, id: string): Calendar_EventInput<D> | undefined => {
  const event = calendar.options.events.find(event => event.id === id);
  return event && !event['~source'] && 'kind' in event ? (event as Calendar_EventInput<D>) : undefined;
};

const adjusted = (target: unknown, anchor: unknown, source: Calendar_EventInput<unknown> | undefined, zone: string) => {
  if (!source || !isDate(anchor) || !isDate(target) || anchor.kind !== source.kind || target.kind !== source.kind)
    return target;
  if (source.kind === 'allDay' && anchor.kind === 'allDay' && target.kind === 'allDay')
    return { ...target, at: target.at.subtract({ days: source.start.until(anchor.at).days }) };
  if (source.kind === 'timed' && anchor.kind === 'timed' && target.kind === 'timed') {
    const offset = source.start.withTimeZone(zone).offset;
    const anchorClock =
      'clock' in anchor && anchor.clock instanceof Temporal.PlainDateTime
        ? anchor.clock
        : anchor.at.withTimeZone(zone).toPlainDateTime();
    const grab = source.start.withTimeZone(zone).toPlainDateTime().until(anchorClock);
    const clock = target.at.withTimeZone(zone).toPlainDateTime().subtract(grab);
    const candidates = (['earlier', 'later'] as const)
      .map(disambiguation => clock.toZonedDateTime(zone, { disambiguation }))
      .filter(at => at.toPlainDateTime().equals(clock));
    const at = candidates.find(at => at.offset === offset) ?? candidates[0];
    return at ? { ...target, at } : undefined;
  }
  return target;
};

const hitAt = (event: PointerEvent, gesture: Calendar_DomGesture) => {
  const document = (event.target as Node | null)?.ownerDocument;
  const element = document?.elementFromPoint(event.clientX, event.clientY);
  if (!element) return;
  for (const host of [...hosts].reverse()) {
    if (!host.root()?.contains(element) || !host.calendar.api.pointer.settings().pointer.enabled) continue;
    const hit = host.hit(element, event, gesture);
    if (hit) return { host, ...hit };
  }
};

export const createCalendarInteractionHost = <D>(calendar: Calendar_DomCalendar<D>): Calendar_DomHost<D> => {
  const surfaces = new Map<HTMLElement, Calendar_DomSurface>();
  const sources = new Map<HTMLElement, Calendar_DomSource | Calendar_DomOperation>();
  let root: HTMLElement | undefined;
  let disconnect: (() => void) | undefined;
  let cancelGesture: (() => void) | undefined;
  const host: Calendar_DomHost<D> = {
    calendar,
    root: () => root,
    hit(element: Element, event: PointerEvent, gesture: Calendar_DomGesture) {
      let current: Element | null = element;
      while (current && root?.contains(current)) {
        const surface = surfaces.get(current as HTMLElement);
        if (surface) {
          const bounds = current.getBoundingClientRect();
          if (!bounds.width || !bounds.height) return;
          const rtl = current.ownerDocument.defaultView?.getComputedStyle(current).direction === 'rtl';
          const x = (event.clientX - bounds.left) / bounds.width;
          const point = surface.point(
            { x: rtl ? 1 - x : x, y: (event.clientY - bounds.top) / bounds.height, bounds, event },
            gesture,
          );
          return { location: calendar.api.interactions.locate(point), surface: current as HTMLElement };
        }
        current = current.parentElement;
      }
    },
    surface(element: HTMLElement, descriptor: Calendar_DomSurface) {
      surfaces.set(element, descriptor);
      return () => {
        surfaces.delete(element);
        cancelHost(host);
        cancelGesture?.();
      };
    },
    source(element: HTMLElement, descriptor: Calendar_DomSource | Calendar_DomOperation) {
      sources.set(element, descriptor);
      return () => {
        sources.delete(element);
        cancelHost(host);
        cancelGesture?.();
      };
    },
    cancel() {
      cancelHost(host);
      cancelGesture?.();
    },
    mount(element: HTMLElement) {
      disconnect?.();
      root = element;
      hosts.add(host);
      const abort = new AbortController();
      const down = (event: PointerEvent) => {
        if (event.button !== 0 || !event.isPrimary || cancelGesture || !calendar.api.pointer.settings().pointer.enabled)
          return;
        const touch = calendar.api.pointer.settings().touch;
        if (event.pointerType === 'touch' && (!touch || touch.enabled === false)) return;
        let current = event.target as HTMLElement | null;
        let descriptor: Calendar_DomSource | Calendar_DomOperation | undefined;
        while (current && root?.contains(current)) {
          descriptor = sources.get(current);
          if (descriptor) break;
          current = current.parentElement;
        }
        const source = descriptor && 'eventId' in descriptor ? eventOf(calendar, descriptor.eventId) : undefined;
        if (descriptor && 'eventId' in descriptor && !source) return;
        const reference =
          source?.kind === 'timed'
            ? descriptor && 'edge' in descriptor && descriptor.edge === 'end'
              ? source.end
              : source.start
            : undefined;
        const gesture: Calendar_DomGesture = {
          kind: source?.kind,
          edge: descriptor && 'edge' in descriptor ? descriptor.edge : undefined,
          offset: reference?.withTimeZone(calendar.options.timeZone).offset,
          time: reference?.withTimeZone(calendar.options.timeZone).toPlainTime().toString(),
        };
        const initial = hitAt(event, gesture);
        if (!initial || initial.host !== host) return;
        const anchor =
          initial.location.status === 'valid'
            ? initial.location.target
            : source?.kind === 'timed' && initial.location.clock
              ? { kind: 'timed', at: source.start, clock: initial.location.clock }
              : undefined;
        if (anchor === undefined) return;
        if (!descriptor && !calendar.api.selection) return;
        if (descriptor && 'eventId' in descriptor && !(descriptor.edge ? calendar.api.resize : calendar.api.move))
          return;
        cancelGesture = trackPointer(event, host, descriptor, source, anchor, gesture, () => {
          cancelGesture = undefined;
        });
      };
      element.addEventListener('pointerdown', down, { signal: abort.signal });
      disconnect = () => {
        cancelHost(host);
        cancelGesture?.();
        abort.abort();
        hosts.delete(host);
        root = undefined;
        disconnect = undefined;
      };
      return disconnect;
    },
    destroy() {
      disconnect?.();
      surfaces.clear();
      sources.clear();
    },
  };
  return host;
};

const trackPointer = (
  down: PointerEvent,
  origin: Host,
  descriptor: Calendar_DomSource | Calendar_DomOperation | undefined,
  source: Calendar_EventInput<unknown> | undefined,
  anchor: unknown,
  gesture: Calendar_DomGesture,
  done: () => void,
  external?: { event: Calendar_EventInput<unknown>; metadata?: unknown },
) => {
  const document = (down.target as Node).ownerDocument!;
  const window = document.defaultView!;
  const config = origin.calendar.api.pointer.settings();
  if (down.pointerType === 'touch' && (!config.touch || config.touch.enabled === false)) {
    done();
    return () => {};
  }
  const abort = new AbortController();
  let latest = down;
  let active = false;
  let ended = false;
  let destination: Host | undefined;
  let token: number | undefined;
  let transfer: Calendar_TransferSource | undefined;
  let frame = 0;
  let timer = 0;
  let finalizing = false;
  let finishRequested = false;
  let watched: { unsubscribe: () => void } | undefined;
  const involved = new Set<Host>();
  const involve = (host: Host) => {
    involved.add(host);
    if (!cancellations.has(host)) cancellations.set(host, new Set());
    cancellations.get(host)!.add(cleanup);
  };
  const cleanup = () => {
    if (ended) return;
    ended = true;
    for (const host of involved) {
      const callbacks = cancellations.get(host);
      callbacks?.delete(cleanup);
      if (!callbacks?.size) cancellations.delete(host);
    }
    abort.abort();
    finalizing = true;
    const captured = down.target as HTMLElement;
    if (captured.hasPointerCapture?.(down.pointerId)) captured.releasePointerCapture(down.pointerId);
    window.clearTimeout(timer);
    window.cancelAnimationFrame(frame);
    watched?.unsubscribe();
    if (token !== undefined) destination?.calendar.api.interactions.cancel(token, 'pointer-cancelled');
    transfer?.release();
    done();
  };
  const watch = () => {
    watched?.unsubscribe();
    watched = destination?.calendar.api.interactions.store.subscribe(() => {
      if (!finalizing && token !== undefined && !destination?.calendar.api.interactions.isActive(token)) cleanup();
    });
  };
  const beginAt = (host: Host) => {
    let start: Calendar_InteractionStart | undefined;
    if (external) start = host.calendar.api.externalDrop?.begin(external.event, external.metadata);
    else if (host !== origin && source && descriptor && 'eventId' in descriptor && !descriptor.edge) {
      if (transfer) start = host.calendar.api.transfer?.begin(transfer);
    } else if (host === origin) {
      if (source && descriptor && 'eventId' in descriptor && !descriptor.edge && !transfer)
        transfer = host.calendar.api.crossCalendar?.prepare(source.id, descriptor.resourceId);
      start = transfer
        ? { status: 'active', token: transfer.token }
        : descriptor && 'begin' in descriptor
          ? descriptor.begin(anchor)
          : descriptor && 'eventId' in descriptor
            ? descriptor.edge
              ? host.calendar.api.resize?.begin(descriptor.eventId, descriptor.edge)
              : host.calendar.api.move?.begin(descriptor.eventId, descriptor.resourceId)
            : isDate(anchor)
              ? host.calendar.api.selection?.begin(anchor)
              : undefined;
    }
    if (start?.status === 'active') {
      involve(host);
      destination = host;
      token = start.token;
      watch();
    }
  };
  const update = () => {
    if (!active || ended) return;
    if (
      !origin.root()?.isConnected ||
      !(down.target as Node).isConnected ||
      (down.pointerType === 'touch' &&
        (!origin.calendar.api.pointer.settings().touch ||
          origin.calendar.api.pointer.settings().touch?.enabled === false)) ||
      !origin.calendar.api.pointer.settings().pointer.enabled ||
      (transfer && !transfer.read())
    ) {
      cleanup();
      return;
    }
    const hit = hitAt(latest, gesture);
    if (!hit || (hit.host !== origin && !external && (!source || gesture.edge || !origin.calendar.api.crossCalendar))) {
      if (token !== undefined) destination?.calendar.api.interactions.unavailable(token, 'outside-surface');
      return;
    }
    if (hit.host !== destination) {
      finalizing = true;
      if (token !== undefined && !(destination === origin && transfer))
        destination?.calendar.api.interactions.cancel(token, 'host-changed');
      token = undefined;
      finalizing = false;
      beginAt(hit.host);
    }
    if (token === undefined || !destination) return;
    if (hit.location.status !== 'valid') {
      destination.calendar.api.interactions.unavailable(token, hit.location.reason);
      return;
    }
    const target =
      descriptor && 'begin' in descriptor
        ? (descriptor.target?.(hit.location.target, anchor) ?? hit.location.target)
        : !gesture.edge && !external
          ? adjusted(hit.location.target, anchor, source, origin.calendar.options.timeZone)
          : hit.location.target;
    if (target === undefined) destination.calendar.api.interactions.unavailable(token, 'nonexistent-time');
    else
      destination.calendar.api.interactions.update(
        token,
        target as Parameters<Calendar_InteractionControls['update']>[1],
      );
  };
  const scroll = (dt: number) => {
    const hit = hitAt(latest, gesture);
    const settings = hit?.host.calendar.api.pointer.settings().autoScroll;
    if (!hit || !settings || settings.enabled === false) return;
    const edge = Math.max(1, settings.edge ?? 40);
    const speed = (Math.max(0, settings.speed ?? 600) * dt) / 1000;
    let element: HTMLElement | null = hit.surface;
    let movedX = false,
      movedY = false;
    while (element) {
      const bounds = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const velocity = (position: number, start: number, end: number) =>
        position < start + edge
          ? -Math.min(1, (start + edge - position) / edge)
          : position > end - edge
            ? Math.min(1, (position - end + edge) / edge)
            : 0;
      const x = velocity(latest.clientX, bounds.left, bounds.right),
        y = velocity(latest.clientY, bounds.top, bounds.bottom);
      if (!movedX && /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth) {
        const previous = element.scrollLeft;
        element.scrollLeft += x * speed;
        movedX = element.scrollLeft !== previous;
      }
      if (!movedY && /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) {
        const previous = element.scrollTop;
        element.scrollTop += y * speed;
        movedY = element.scrollTop !== previous;
      }
      element = element.parentElement;
    }
    const documentScroll = document.scrollingElement;
    if (documentScroll) {
      const x = latest.clientX < edge ? -1 : latest.clientX > window.innerWidth - edge ? 1 : 0;
      const y = latest.clientY < edge ? -1 : latest.clientY > window.innerHeight - edge ? 1 : 0;
      if (!movedX) documentScroll.scrollLeft += x * speed;
      if (!movedY) documentScroll.scrollTop += y * speed;
    }
  };
  let previous = window.performance.now();
  const tick = (now: number) => {
    if (ended) return;
    if (!finishRequested) scroll(Math.min(50, now - previous));
    previous = now;
    update();
    if (finishRequested && !ended) {
      finalizing = true;
      const result = token === undefined ? undefined : destination?.calendar.api.interactions.commit(token);
      if (result !== 'awaiting-owner') cleanup();
      else finalizing = false;
    }
    if (!ended) frame = window.requestAnimationFrame(tick);
  };
  const activate = () => {
    if (ended || active) return;
    active = true;
    beginAt(origin);
    if (!external && token === undefined) {
      cleanup();
      return;
    }
    try {
      (down.target as HTMLElement).setPointerCapture(down.pointerId);
    } catch {
      /* Detached sources cannot capture. */
    }
    update();
    frame = window.requestAnimationFrame(tick);
  };
  involve(origin);
  document.addEventListener(
    'pointermove',
    event => {
      if (event.pointerId !== down.pointerId) return;
      latest = event;
      const distance = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
      if (!active && down.pointerType === 'touch' && distance > (config.touch?.tolerance ?? 8)) cleanup();
      else if (!active && down.pointerType !== 'touch' && distance >= (config.pointer.distance ?? 4)) activate();
      if (active) {
        event.preventDefault();
        update();
      }
    },
    { signal: abort.signal, passive: false },
  );
  document.addEventListener(
    'pointerup',
    event => {
      if (event.pointerId !== down.pointerId) return;
      latest = event;
      finishRequested = true;
      update();
      finalizing = true;
      if (token !== undefined) {
        const status = destination?.calendar.api.interactions.commit(token);
        if (status === 'awaiting-owner') {
          finalizing = false;
          return;
        }
      }
      cleanup();
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    'pointercancel',
    event => {
      if (event.pointerId === down.pointerId) cleanup();
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    'lostpointercapture',
    event => {
      if (event.pointerId === down.pointerId && !finalizing && !finishRequested) cleanup();
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') cleanup();
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    'touchmove',
    event => {
      if (active) event.preventDefault();
      else cleanup();
    },
    { signal: abort.signal, passive: false },
  );
  document.addEventListener(
    'scroll',
    () => {
      if (active) update();
      else if (down.pointerType === 'touch') cleanup();
    },
    { signal: abort.signal, capture: true },
  );
  window.addEventListener('blur', cleanup, { signal: abort.signal });
  if (down.pointerType === 'touch') timer = window.setTimeout(activate, Math.max(0, config.touch?.delay ?? 500));
  return cleanup;
};

export const createExternalDraggable = <D>(
  element: HTMLElement,
  getSource: () => { event: Calendar_EventInput<D>; metadata?: unknown },
) => {
  let cancel: (() => void) | undefined;
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || cancel) return;
    const origin = [...hosts].find(
      host =>
        host.root()?.ownerDocument === element.ownerDocument &&
        host.calendar.api.externalDrop &&
        host.calendar.api.pointer.settings().pointer.enabled,
    );
    if (!origin) return;
    const touch = origin.calendar.api.pointer.settings().touch;
    if (event.pointerType === 'touch' && (!touch || touch.enabled === false)) return;
    const source = getSource();
    cancel = trackPointer(
      event,
      origin,
      undefined,
      undefined,
      undefined,
      { kind: source.event.kind },
      () => {
        cancel = undefined;
      },
      source,
    );
  };
  element.addEventListener('pointerdown', down);
  return () => {
    cancel?.();
    element.removeEventListener('pointerdown', down);
  };
};

export const createCalendarInteractionBindings = <D>(calendar: Calendar_DomCalendar<D>) => {
  const host = createCalendarInteractionHost(calendar);
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
