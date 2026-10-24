import type {
  Calendar_DomCalendar,
  Calendar_DomGesture,
  Calendar_DomSurface,
  Calendar_InteractionScope,
  Calendar_ExternalDragOptions,
} from '#interactions/dom.types';
import type { Calendar_InputSettings } from '#features/pointer/pointer.types';
import type { DomHost as Host, DomBinding, DomSession, DomTransfer } from '#interactions/dom.internal';

const scopes = new WeakMap<Calendar_InteractionScope, Set<Host>>();
export const createCalendarInteractionScope = (): Calendar_InteractionScope => {
  const scope = Object.freeze({ '~interactionScope': true as const });
  scopes.set(scope, new Set());
  return scope;
};
const scopeHosts = (scope: Calendar_InteractionScope) => {
  const hosts = scopes.get(scope);
  if (!hosts) throw new Error('[calendar] use createCalendarInteractionScope to create a drag scope');
  return hosts;
};
const cancellations = new Map<Host, Set<() => void>>();
const cancelHost = (host: Host) => {
  for (const cancel of cancellations.get(host) ?? []) cancel();
};

const hitAt = (hosts: Set<Host>, event: PointerEvent, gesture: Calendar_DomGesture) => {
  const document = (event.target as Node | null)?.ownerDocument;
  const element = document?.elementFromPoint(event.clientX, event.clientY);
  if (!element) return;
  for (const host of [...hosts].reverse()) {
    if (!host.root()?.contains(element) || !host.calendar.api.pointer.settings().pointer.enabled) continue;
    const hit = host.hit(element, event, gesture);
    if (hit) return { host, ...hit };
  }
};

export const createDomHost = (
  calendar: Calendar_DomCalendar,
  scope: Calendar_InteractionScope,
  blank: () => DomBinding | undefined,
  receive: Host['receive'],
): Host => {
  const hosts = scopeHosts(scope);
  const surfaces = new Map<HTMLElement, Calendar_DomSurface>();
  const sources = new Map<HTMLElement, () => DomBinding | undefined>();
  let root: HTMLElement | undefined;
  let disconnect: (() => void) | undefined;
  let cancelGesture: (() => void) | undefined;
  const host: Host = {
    calendar,
    receive,
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
    source(element: HTMLElement, descriptor: () => DomBinding | undefined) {
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
        let descriptor: (() => DomBinding | undefined) | undefined;
        while (current && root?.contains(current)) {
          descriptor = sources.get(current);
          if (descriptor) break;
          current = current.parentElement;
        }
        const binding = descriptor ? descriptor() : blank();
        if (!binding) return;
        const gesture = binding.gesture ?? {};
        const initial = hitAt(hosts, event, gesture);
        if (!initial || initial.host !== host) return;
        const anchor = binding.anchor
          ? binding.anchor(initial.location)
          : initial.location.status === 'valid'
            ? initial.location.target
            : undefined;
        if (anchor === undefined) return;
        cancelGesture = trackPointer(
          event,
          hosts,
          host,
          binding,
          anchor,
          gesture,
          () => {
            cancelGesture = undefined;
          },
          () => calendar.api.pointer.settings(),
        );
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
  hosts: Set<Host>,
  origin: Host | undefined,
  binding: DomBinding,
  anchor: unknown,
  gesture: Calendar_DomGesture,
  done: () => void,
  settings: () => Calendar_InputSettings,
  external?: unknown,
) => {
  const document = (down.target as Node).ownerDocument!;
  const window = document.defaultView!;
  const config = settings();
  if (down.pointerType === 'touch' && (!config.touch || config.touch.enabled === false)) {
    done();
    return () => {};
  }
  const abort = new AbortController();
  let latest = down;
  let active = false;
  let ended = false;
  let destination: Host | undefined;
  let session: DomSession | undefined;
  let transfer: DomTransfer | undefined;
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
    session?.cancel('pointer-cancelled');
    transfer?.release();
    done();
  };
  const watch = () => {
    watched?.unsubscribe();
    watched = destination?.calendar.api.interactions.store.subscribe(() => {
      if (!finalizing && session && !session.isActive()) cleanup();
    });
  };
  const beginAt = (host: Host) => {
    const start = external
      ? host.receive(external)
      : host === origin
        ? binding.begin(anchor)
        : transfer
          ? host.receive(transfer.data)
          : undefined;
    if (host === origin) transfer = binding.transfer?.();
    if (start?.status === 'active') {
      involve(host);
      destination = host;
      session = start.session;
      watch();
    }
  };
  const update = () => {
    if (!active || ended) return;
    if (
      (origin && !origin.root()?.isConnected) ||
      !(down.target as Node).isConnected ||
      (down.pointerType === 'touch' && (!settings().touch || settings().touch?.enabled === false)) ||
      !settings().pointer.enabled ||
      (transfer && !transfer.valid())
    ) {
      cleanup();
      return;
    }
    const hit = hitAt(hosts, latest, gesture);
    if (!hit || (hit.host !== origin && !external && !transfer)) {
      session?.unavailable('outside-surface');
      return;
    }
    if (hit.host !== destination) {
      finalizing = true;
      if (!(destination === origin && transfer)) session?.cancel('host-changed');
      session = undefined;
      finalizing = false;
      beginAt(hit.host);
    }
    if (!session || !destination) return;
    if (hit.location.status !== 'valid') {
      session.unavailable(hit.location.reason);
      return;
    }
    const target = binding.target ? binding.target(hit.location.target, anchor) : hit.location.target;
    if (target === undefined) session.unavailable('unsupported-target');
    else session.update(target);
  };
  const scroll = (dt: number) => {
    const hit = hitAt(hosts, latest, gesture);
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
      const result = session?.commit();
      if (result?.status !== 'awaiting-owner') cleanup();
      else finalizing = false;
    }
    if (!ended) frame = window.requestAnimationFrame(tick);
  };
  const activate = () => {
    if (ended || active) return;
    active = true;
    if (origin) beginAt(origin);
    if (!external && !session) {
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
  if (origin) involve(origin);
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
      if (session) {
        const status = session.commit();
        if (status.status === 'awaiting-owner') {
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

export const createDomDraggable = (
  element: HTMLElement,
  getSource: () => { data: unknown; gesture?: Calendar_DomGesture },
  options: Calendar_ExternalDragOptions,
) => {
  const hosts = scopeHosts(options.scope);
  let cancel: (() => void) | undefined;
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || cancel || options.pointer.enabled === false) return;
    if (event.pointerType === 'touch' && (!options.touch || options.touch.enabled === false)) return;
    const source = getSource();
    cancel = trackPointer(
      event,
      hosts,
      undefined,
      { begin: () => undefined },
      undefined,
      source.gesture ?? {},
      () => {
        cancel = undefined;
      },
      () => ({ ...options, pointer: { enabled: true, ...options.pointer } }),
      source.data,
    );
  };
  element.addEventListener('pointerdown', down);
  return () => {
    cancel?.();
    element.removeEventListener('pointerdown', down);
  };
};
