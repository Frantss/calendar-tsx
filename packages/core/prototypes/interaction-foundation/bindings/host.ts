import {
  createRuntime,
  resolveClockTarget,
  type Ownership,
  type Proposal,
  type Selection,
  type Target,
} from '../runtime';
import { locate, project, surfaceKey, type Geometry, type Located, type Preview, type Surface } from './geometry';
import type { Instance, Setup } from './setup';

export const createHost = (
  calendar: Instance,
  setup: Setup,
  ownership: Ownership,
  emit: (proposal: Proposal) => void,
) => {
  const surfaces = new Map<string, { surface: Surface; element: HTMLElement }>();
  const refs = new Map<string, (element: HTMLElement | null) => void>();
  const observers = new Set<() => void>();
  let message = 'Ready';
  let lastMove: Exclude<Proposal, { kind: 'select' }> | null = null;
  let baseline = setup.counts.baseBuilds;
  let origin: string | undefined;
  let activeSurface: string | undefined;
  let request: { token: number; target: Target | string; finish: boolean } | null = null;
  let pumping = false;
  const geometry = (): Geometry | undefined => {
    const state = calendar.store.state;
    if (state.layout.kind !== 'timeGrid' && state.layout.kind !== 'timeline') return;
    return {
      model: state.layout,
      range: state.context.range,
      settings: calendar.options.views[calendar.options.view] as Geometry['settings'],
      input: {
        range: state.context.range,
        period: state.context.period,
        timeZone: calendar.options.timeZone,
        now: state.now,
        events: calendar.options.events,
        backgroundEvents: [],
        resources: calendar.options.resources ?? [],
      },
    };
  };
  const runtime = createRuntime({
    features: setup.features,
    read: () => calendar.options,
    ownership,
    emit: proposal => {
      setup.counts.lastDraftBuilds = setup.counts.baseBuilds - baseline;
      setup.counts.emissions++;
      if (proposal.kind !== 'select') lastMove = proposal;
      emit(proposal);
    },
  });
  let previews: Preview[] = [];
  let previousCandidate = runtime.store.state.candidate;
  let previousLayout = calendar.store.state.layout;
  const read = () => ({
    draft: runtime.store.state,
    previews,
    message,
    selectedRange:
      'selectedRange' in calendar.store.state ? (calendar.store.state.selectedRange as Selection | null) : null,
    features: Object.keys(setup.features),
    lastMove,
    counts: { ...setup.counts },
  });
  let snapshot = read();
  const publish = () => {
    const candidate = runtime.store.state.candidate;
    const model = calendar.store.state.layout;
    if (candidate !== previousCandidate || model !== previousLayout) {
      const context = geometry();
      previews = context && candidate?.status === 'valid' ? project(context, candidate.proposal) : [];
      if (context && candidate?.status === 'valid') setup.counts.previewBuilds++;
      previousCandidate = candidate;
      previousLayout = model;
    }
    snapshot = read();
    observers.forEach(observer => observer());
  };
  const begin = (intent: Parameters<typeof runtime.begin>[0]) => {
    baseline = setup.counts.baseBuilds;
    const result = runtime.begin(intent);
    message = result.status;
    publish();
    return result;
  };
  const pump = () => {
    if (!request || pumping) return;
    pumping = true;
    const pending = request;
    const result =
      typeof pending.target === 'string'
        ? runtime.unavailable(pending.token, pending.target)
        : runtime.update(pending.token, pending.target);
    message = result ?? 'no-target';
    if (result !== 'awaiting-owner') {
      if (pending.finish) {
        const completed =
          typeof pending.target === 'string'
            ? runtime.cancel(pending.token, 'invalid-drop')
            : runtime.commit(pending.token);
        message = completed ?? 'cancelled';
        if (completed !== 'awaiting-owner') request = null;
      } else request = null;
    }
    pumping = false;
    publish();
  };
  const refresh = () => {
    runtime.refresh();
    pump();
    publish();
  };
  const unregister = (key: string, element: HTMLElement) => {
    if (surfaces.get(key)?.element !== element) return;
    surfaces.delete(key);
    setup.counts.surfaces = surfaces.size;
    queueMicrotask(() => {
      if (!surfaces.has(key) && (key === origin || key === activeSurface)) {
        const token = runtime.store.state.session?.token;
        if (token !== undefined) runtime.cancel(token, 'surface-lost');
        request = null;
        publish();
      }
    });
  };
  const register = (surface: Surface, element: HTMLElement) => {
    const key = surfaceKey(surface);
    element.dataset.surface = key;
    surfaces.set(key, { surface, element });
    setup.counts.surfaces = surfaces.size;
    return () => unregister(key, element);
  };
  const ref = (surface: Surface) => {
    const key = surfaceKey(surface);
    if (!refs.has(key)) {
      let release: (() => void) | undefined;
      refs.set(key, element => {
        release?.();
        release = element ? register(surface, element) : undefined;
      });
    }
    return refs.get(key)!;
  };
  const locatePoint = (
    surface: Surface,
    fraction: number,
    kind: Target['kind'] = 'timed',
    offset?: string,
  ): Located => {
    const context = geometry();
    return context
      ? locate(context, surface, fraction, kind, offset)
      : ({ status: 'unavailable', reason: 'display-only-view' } as const);
  };
  const attach = (root: HTMLElement) => {
    const controller = new AbortController();
    const { signal } = controller;
    let pointer: {
      id: number;
      token: number;
      grab: number;
      kind: Target['kind'];
      offset?: string;
      edge?: 'start' | 'end';
    } | null = null;
    let ownedToken: number | undefined;
    const hit = (event: PointerEvent, kind?: Target['kind'], offset?: string, edge?: 'start' | 'end'): Located => {
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-surface]');
      const registered = element && surfaces.get(element.dataset.surface!);
      if (!registered) return { status: 'unavailable', reason: 'outside-surface' } as const;
      activeSurface = surfaceKey(registered.surface);
      const bounds = registered.element.getBoundingClientRect();
      const columns =
        registered.surface.kind === 'allDay'
          ? [...surfaces.values()]
              .filter(value => value.surface.kind === 'column')
              .map(value => value.element.getBoundingClientRect())
          : [];
      const left = columns.length ? Math.min(...columns.map(rect => rect.left)) : bounds.left;
      const width = columns.length ? Math.max(...columns.map(rect => rect.right)) - left : bounds.width;
      const fraction =
        registered.surface.kind === 'column'
          ? (event.clientY - bounds.top) / bounds.height
          : (event.clientX - left) / width;
      if (kind === 'allDay' && edge) {
        const context = geometry()!;
        if (context.model.kind === 'timeGrid' && registered.surface.kind !== 'allDay')
          return { status: 'unavailable', reason: 'all-day-surface-required' };
        const index =
          Math.round(
            fraction *
              (context.model.kind === 'timeGrid'
                ? context.model.columns.length
                : context.range.start.until(context.range.end).days + 1),
          ) - (edge === 'end' ? 1 : 0);
        if (context.model.kind === 'timeGrid') {
          const column = context.model.columns[index];
          return column
            ? { status: 'valid', proposal: { kind: 'allDay', at: column.date, resourceId: column.resource?.id } }
            : { status: 'unavailable', reason: 'outside-surface' };
        }
        const row = context.model.rows.find(
          row => registered.surface.kind === 'lane' && row.key === registered.surface.key,
        );
        return {
          status: 'valid',
          proposal: { kind: 'allDay', at: context.range.start.add({ days: index }), resourceId: row?.resource?.id },
        };
      }
      return locatePoint(registered.surface, fraction, registered.surface.kind === 'allDay' ? 'allDay' : kind, offset);
    };
    const queue = (event: PointerEvent, finish: boolean) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const found = hit(event, pointer.kind, pointer.offset, pointer.edge);
      let target: Target | string = found.status === 'valid' ? found.proposal : found.reason;
      if (pointer.kind === 'timed' && found.clock) {
        const local = found.clock.subtract({ minutes: pointer.grab });
        const resolved = resolveClockTarget(local.toString(), calendar.options.timeZone, pointer.offset);
        target = resolved.status === 'valid' ? { ...resolved.proposal, resourceId: found.resourceId } : resolved.reason;
      } else if (typeof target !== 'string' && target.kind === 'allDay' && pointer.grab)
        target = { ...target, at: target.at.subtract({ days: pointer.grab }) };
      request = { token: pointer.token, target, finish };
      pump();
    };
    root.addEventListener(
      'pointerdown',
      event => {
        if (event.button !== 0 || pointer) return;
        const eventId = (event.target as HTMLElement).closest<HTMLElement>('[data-event-id]')?.dataset.eventId;
        const source = calendar.options.events.find(item => item.id === eventId);
        const edge = (event.target as HTMLElement).closest<HTMLElement>('[data-resize-edge]')?.dataset.resizeEdge as
          | 'start'
          | 'end'
          | undefined;
        const sourceOffset =
          source?.kind === 'timed'
            ? (edge === 'end' ? source.end : source.start).withTimeZone(calendar.options.timeZone).offset
            : undefined;
        const found = hit(event, source?.kind, sourceOffset, edge);
        if (found.status !== 'valid' && !(source?.kind === 'timed' && found.clock)) {
          message = found.reason;
          publish();
          return;
        }
        const result = begin(
          source
            ? edge
              ? { kind: 'resize', eventId: source.id, edge }
              : { kind: 'move', eventId: source.id }
            : { kind: 'select', anchor: (found as Extract<Located, { status: 'valid' }>).proposal },
        );
        if (result.status !== 'active') return;
        const point = found.status === 'valid' ? found.proposal : undefined;
        const grab =
          source?.kind === 'timed' && found.clock && !edge
            ? source.start
                .withTimeZone(calendar.options.timeZone)
                .toPlainDateTime()
                .until(found.clock)
                .total({ unit: 'minutes' })
            : source?.kind === 'allDay' && point?.kind === 'allDay' && !edge
              ? source.start.until(point.at).days
              : 0;
        pointer = {
          id: event.pointerId,
          token: result.token,
          grab,
          kind: source?.kind ?? point!.kind,
          offset: sourceOffset,
          edge,
        };
        ownedToken = result.token;
        origin = activeSurface;
        root.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      { signal },
    );
    root.addEventListener('pointermove', event => queue(event, false), { signal });
    root.addEventListener(
      'pointerup',
      event => {
        queue(event, true);
        if (pointer?.id === event.pointerId) {
          pointer = null;
          root.releasePointerCapture(event.pointerId);
        }
      },
      { signal },
    );
    const cancel = () => {
      const token = pointer?.token ?? ownedToken;
      pointer = null;
      ownedToken = undefined;
      if (request?.token === token) request = null;
      if (token !== undefined) runtime.cancel(token, 'pointer-cancelled');
      publish();
    };
    root.addEventListener('pointercancel', cancel, { signal });
    root.addEventListener(
      'lostpointercapture',
      () => {
        if (pointer) cancel();
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') {
          const token = runtime.store.state.session?.token;
          request = null;
          pointer = null;
          if (token !== undefined) runtime.cancel(token, 'escape');
          publish();
        }
      },
      { signal },
    );
    setup.counts.listeners += 6;
    publish();
    return () => {
      controller.abort();
      setup.counts.listeners -= 6;
      cancel();
    };
  };
  const pointAt = (hour: number, resource = 'b', kind: Target['kind'] = 'timed') => {
    const context = geometry();
    if (!context) return { status: 'unavailable', reason: 'display-only-view' } as const;
    const model = context.model;
    if (kind === 'allDay' && model.kind === 'timeGrid') {
      const date = context.range.start.add({ days: Math.floor(hour / 24) });
      const index = model.columns.findIndex(column => column.resource?.id === resource && column.date.equals(date));
      return locatePoint({ kind: 'allDay' }, (index + 0.5) / model.columns.length, kind);
    }
    const surface: Surface =
      model.kind === 'timeGrid'
        ? {
            kind: 'column',
            key: model.columns.find(
              column => column.resource?.id === resource && column.date.equals(context.range.start),
            )!.key,
          }
        : { kind: 'lane', key: resource };
    return locatePoint(
      surface,
      hour / (model.kind === 'timeGrid' ? 24 : context.range.start.until(context.range.end).days * 24 + 24),
      kind,
    );
  };
  const command = (action: 'move' | 'select' | 'allDay' | 'resize-start' | 'resize-end' | 'complete' | 'cancel') => {
    if (action === 'complete') {
      const token = runtime.store.state.session?.token;
      if (token !== undefined) {
        const target = runtime.store.state.session?.target;
        if (target) {
          request = { token, target, finish: true };
          pump();
        }
      }
      return;
    }
    if (action === 'cancel') {
      request = null;
      const token = runtime.store.state.session?.token;
      if (token !== undefined) runtime.cancel(token);
      publish();
      return;
    }
    origin = activeSurface = undefined;
    const anchor = pointAt(14, 'b', action === 'allDay' ? 'allDay' : 'timed');
    const target = pointAt(
      action === 'resize-start'
        ? 13.5
        : action === 'resize-end'
          ? 16
          : action === 'move'
            ? 14
            : action === 'allDay'
              ? 38
              : 15,
      action.startsWith('resize') ? 'a' : 'b',
      action === 'allDay' ? 'allDay' : 'timed',
    );
    if (anchor.status !== 'valid' || target.status !== 'valid') {
      message = 'unavailable';
      publish();
      return;
    }
    const result = begin(
      action.startsWith('resize')
        ? { kind: 'resize', eventId: 'Resizable', edge: action === 'resize-start' ? 'start' : 'end' }
        : action === 'move'
          ? { kind: 'move', eventId: 'Appointment' }
          : { kind: 'select', anchor: anchor.proposal },
    );
    if (result.status === 'active') {
      request = { token: result.token, target: target.proposal, finish: false };
      pump();
    }
  };
  return {
    runtime,
    geometry,
    locate: locatePoint,
    ref,
    register,
    attach,
    refresh,
    command,
    project(proposal: Proposal) {
      const context = geometry();
      return context ? project(context, proposal) : [];
    },
    getSnapshot: () => snapshot,
    subscribe(this: void, listener: () => void) {
      observers.add(listener);
      return () => {
        observers.delete(listener);
      };
    },
    connect() {
      setup.counts.connections++;
      const a = runtime.store.subscribe(publish);
      const b = calendar.store.subscribe(() => {
        setup.counts.baseNotifications++;
        refresh();
      });
      const c = setup.atom.subscribe(refresh);
      publish();
      return () => {
        a();
        b.unsubscribe();
        c.unsubscribe();
        setup.counts.connections--;
        request = null;
        const token = runtime.store.state.session?.token;
        if (token !== undefined) runtime.cancel(token, 'unmounted');
        publish();
      };
    },
    inspect: () => ({
      ...read(),
      view: calendar.options.view,
      events: calendar.options.events,
      stateKeys: Object.keys(calendar.store.state),
      baseLayout: calendar.store.state.layout,
      observers: observers.size,
    }),
    removeSurface(key: string) {
      const value = surfaces.get(key);
      if (value) unregister(key, value.element);
    },
    apply: () => lastMove,
  };
};
export type Host = ReturnType<typeof createHost>;
export type HostState = ReturnType<Host['getSnapshot']>;
export const rangeLabel = (range: Selection | null) =>
  range ? `${range.kind}: ${range.start.toString()} → ${range.end.toString()}` : 'None';
export const expose = (host: Host) => {
  (window as Window & { interactionProbe?: Host }).interactionProbe = host;
};
