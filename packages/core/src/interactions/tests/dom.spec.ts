import { createCalendarInteractionScope } from '#interactions/dom-host';
import { createCalendarDomOperation } from '#interactions/dom-operation';
import { interactionTestViews } from '#tests/support/interaction.setup';
import { Temporal } from 'temporal-polyfill';
import { afterEach, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createCalendar } from '#calendar/calendar';
import { timeGridView, timelineView } from '#views/views';
import { interactionFeature } from '#features/interaction/interaction-feature';
import { interactionIdle } from '#features/interaction/interaction-runtime';
import { eventMoveFeature } from '#features/event-move/event-move-feature';
import { eventResizeFeature } from '#features/event-resize/event-resize-feature';
import { dateSelectionFeature } from '#features/date-selection/date-selection-feature';
import { constraintsFeature } from '#features/constraints/constraints-feature';
import { pointerFeature } from '#features/pointer/pointer-feature';
import { touchFeature } from '#features/touch/touch-feature';
import { autoScrollFeature } from '#features/auto-scroll/auto-scroll-feature';
import { externalDropFeature } from '#features/external-drop/external-drop-feature';
import { crossCalendarFeature } from '#features/cross-calendar/cross-calendar-feature';
import { createCalendarDomHost, createCalendarInteractionHost, createExternalDraggable, timeGridSurface, timelineSurface } from '#interactions/dom';
import type { Calendar_InteractionSnapshot } from '#features/interaction/interaction.types';

const date = Temporal.PlainDate.from('2026-10-23');
const at = (hour: number) => date.toZonedDateTime({ timeZone: 'UTC', plainTime: `${String(hour).padStart(2, '0')}:00` });
const event = { id: 'a', kind: 'timed' as const, start: at(9), end: at(10), data: { title: 'A' } };
const base = { date, timeZone: 'UTC', view: 'day' as const, events: [event], onNavigate: () => {} };
const scope = createCalendarInteractionScope();
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach(cleanup => cleanup());
  document.body.replaceChildren();
});
const surface = (left = 0) => {
  const root = document.createElement('div');
  root.style.cssText = `position:fixed;left:${left}px;top:0;width:200px;height:480px;`;
  document.body.append(root);
  return root;
};
const pointer = (element: Element, type: string, x: number, y: number, pointerType = 'mouse') =>
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 1,
      isPrimary: true,
      pointerType,
    }),
  );
const setup = (calendar: Parameters<typeof createCalendarInteractionHost<any>>[0], root = surface()) => {
  const host = createCalendarInteractionHost(calendar, { scope });
  host.surface(root, timeGridSurface(`all:${date.toString()}`));
  cleanups.push(host.mount(root));
  return { host, root };
};
const child = (root: HTMLElement, top = 180, left = 0) => {
  const source = document.createElement('button');
  source.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:100px;height:20px;`;
  root.append(source);
  return source;
};

it('mounts selection independently, honors activation distance, and releases the session on unmount', () => {
  const onSelectionChange = vi.fn();
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: { interactionFeature: interactionFeature(), pointerFeature: pointerFeature(), dateSelectionFeature: dateSelectionFeature() },
    }),
  });
  const calendar = createCalendar({ ...base, ...views, onSelectionChange });
  const { host, root } = setup(calendar);
  pointer(root, 'pointerdown', 150, 180);
  pointer(root, 'pointermove', 150, 182);
  expect(calendar.api.interactions.store.state.session).toBeNull();
  pointer(root, 'pointermove', 150, 220);
  expect(calendar.api.interactions.store.state.preview?.status).toBe('valid');
  pointer(root, 'pointerup', 150, 220);
  expect(onSelectionChange).toHaveBeenCalledOnce();
  expect(onSelectionChange.mock.calls[0]![0].end.equals(at(11))).toBe(true);
  pointer(root, 'pointerdown', 150, 180);
  pointer(root, 'pointermove', 150, 220);
  host.destroy();
  expect(calendar.api.interactions.store.state.session).toBeNull();
  pointer(root, 'pointerup', 150, 220);
  expect(onSelectionChange).toHaveBeenCalledOnce();
});

it('resizes independently, rejects crossed edges and cancels on Escape and removed surfaces', () => {
  const onEventResize = vi.fn();
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: { interactionFeature: interactionFeature(), pointerFeature: pointerFeature(), eventResizeFeature: eventResizeFeature() },
    }),
  });
  const calendar = createCalendar({ ...base, ...views, onEventResize });
  const { host, root } = setup(calendar);
  const handle = child(root, 195);
  const remove = host.source(handle, { eventId: 'a', edge: 'end' });
  pointer(handle, 'pointerdown', 20, 200);
  pointer(root, 'pointermove', 20, 240);
  pointer(root, 'pointerup', 20, 240);
  expect(onEventResize).toHaveBeenCalledOnce();
  expect(onEventResize.mock.calls[0]![0].after.end.equals(at(12))).toBe(true);
  pointer(handle, 'pointerdown', 20, 200);
  pointer(root, 'pointermove', 20, 160);
  pointer(root, 'pointerup', 20, 160);
  expect(onEventResize).toHaveBeenCalledOnce();
  pointer(handle, 'pointerdown', 20, 200);
  pointer(root, 'pointermove', 20, 240);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(calendar.api.interactions.store.state.session).toBeNull();
  pointer(handle, 'pointerdown', 20, 200);
  pointer(root, 'pointermove', 20, 240);
  remove();
  expect(calendar.api.interactions.store.state.session).toBeNull();
});

it('waits for controlled owner acknowledgment through release and emits once', async () => {
  const onEventMove = vi.fn();
  let snapshot = interactionIdle();
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: { interactionFeature: interactionFeature(), pointerFeature: pointerFeature(), eventMoveFeature: eventMoveFeature() },
    }),
  });
  const calendar = createCalendar({
    ...base,
    ...views,
    onEventMove,
    interactionOwnership: {
      mode: 'controlled',
      read: () => snapshot,
      onChange: (next: Calendar_InteractionSnapshot) => {
        window.setTimeout(() => {
          snapshot = next;
          calendar.api.interactions.refresh();
        }, 10);
      },
    },
  });
  const { host, root } = setup(calendar);
  const source = child(root);
  host.source(source, { eventId: 'a' });
  await userEvent.dragAndDrop(source, root, { sourcePosition: { x: 20, y: 0 }, targetPosition: { x: 20, y: 240 } });
  await vi.waitFor(() => expect(onEventMove).toHaveBeenCalledOnce());
  expect(onEventMove.mock.calls[0]![0].after.start.equals(at(12))).toBe(true);
  expect(calendar.options.events[0]).toBe(event);
});

it('requires opt-in touch delay and lets early movement cancel instead of editing', async () => {
  const onSelectionChange = vi.fn();
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: {
        interactionFeature: interactionFeature(),
        pointerFeature: pointerFeature(),
        touchFeature: touchFeature(),
        dateSelectionFeature: dateSelectionFeature(),
      },
    }),
  });
  const calendar = createCalendar({ ...base, ...views, onSelectionChange, touch: { delay: 20, tolerance: 5 } });
  const { root } = setup(calendar);
  pointer(root, 'pointerdown', 150, 180, 'touch');
  pointer(root, 'pointermove', 150, 200, 'touch');
  await new Promise(resolve => setTimeout(resolve, 30));
  expect(calendar.api.interactions.store.state.session).toBeNull();
  pointer(root, 'pointerdown', 150, 180, 'touch');
  await vi.waitFor(() => expect(calendar.api.interactions.store.state.session).not.toBeNull());
  pointer(root, 'pointermove', 150, 220, 'touch');
  pointer(root, 'pointerup', 150, 220, 'touch');
  expect(onSelectionChange).toHaveBeenCalledOnce();
});

it('scrolls a nested viewport and updates the target while the pointer stays still', async () => {
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: {
        interactionFeature: interactionFeature(),
        pointerFeature: pointerFeature(),
        autoScrollFeature: autoScrollFeature(),
        dateSelectionFeature: dateSelectionFeature(),
      },
    }),
  });
  const calendar = createCalendar({ ...base, ...views, autoScroll: { speed: 800, edge: 30 } });
  const root = surface();
  root.style.height = '120px';
  root.style.overflowY = 'auto';
  const track = document.createElement('div');
  track.style.height = '480px';
  root.append(track);
  const host = createCalendarInteractionHost(calendar, { scope });
  host.surface(track, timeGridSurface(`all:${date.toString()}`));
  cleanups.push(host.mount(root));
  pointer(track, 'pointerdown', 150, 80);
  pointer(track, 'pointermove', 150, 115);
  await vi.waitFor(() => expect(root.scrollTop).toBeGreaterThan(25));
  const current = calendar.api.interactions.store.state.candidate;
  expect(
    current?.status === 'valid' && current.proposal.kind === 'select' && current.proposal.range.kind === 'timed' && current.proposal.range.end.hour,
  ).toBeGreaterThan(6);
  host.cancel();
  const stopped = root.scrollTop;
  await new Promise(resolve => setTimeout(resolve, 40));
  expect(root.scrollTop).toBe(stopped);
});

it('coordinates controlled hosts and emits only the source transfer proposal', async () => {
  const onEventTransfer = vi.fn(),
    onEventMove = vi.fn();
  const ownership = () => {
    let snapshot = interactionIdle();
    return {
      mode: 'controlled' as const,
      read: () => snapshot,
      onChange: (next: Calendar_InteractionSnapshot) => {
        window.setTimeout(() => {
          snapshot = next;
        }, 10);
      },
    };
  };
  const features = {
    interactionFeature: interactionFeature(),
    pointerFeature: pointerFeature(),
    eventMoveFeature: eventMoveFeature(),
    crossCalendarFeature: crossCalendarFeature(),
    constraintsFeature: constraintsFeature(),
  };
  const views = interactionTestViews({ day: timeGridView({ days: 1, features }) });
  const sourceCalendar = createCalendar({
    ...base,
    ...views,
    interactionOwnership: ownership(),
    crossCalendar: { id: 'source' },
    onEventTransfer,
    onEventMove,
    constraints: { preventOverlap: false },
  });
  const destinationCalendar = createCalendar({
    ...base,
    ...views,
    events: [] as typeof base.events,
    interactionOwnership: ownership(),
    crossCalendar: { id: 'destination' },
    constraints: { preventOverlap: false },
  });
  const sourceHost = setup(sourceCalendar, surface()),
    destinationHost = setup(destinationCalendar, surface(300));
  const source = child(sourceHost.root);
  sourceHost.host.source(source, { eventId: 'a' });
  await userEvent.dragAndDrop(source, destinationHost.root, { sourcePosition: { x: 20, y: 0 }, targetPosition: { x: 20, y: 240 } });
  await vi.waitFor(() => expect(onEventTransfer).toHaveBeenCalledOnce());
  await vi.waitFor(() => {
    sourceCalendar.api.interactions.refresh();
    destinationCalendar.api.interactions.refresh();
    expect(sourceCalendar.api.interactions.store.state.session).toBeNull();
    expect(destinationCalendar.api.interactions.store.state.session).toBeNull();
  });
  expect(onEventMove).not.toHaveBeenCalled();
  expect(sourceCalendar.api.interactions.store.state.session).toBeNull();
  expect(destinationCalendar.api.interactions.store.state.session).toBeNull();
});

it('receives an external source in a timeline without installing movement', () => {
  const onExternalDrop = vi.fn();
  const views = interactionTestViews({
    day: timelineView({
      days: 1,
      features: { interactionFeature: interactionFeature(), pointerFeature: pointerFeature(), externalDropFeature: externalDropFeature() },
    }),
  });
  const calendar = createCalendar({ ...base, ...views, events: [], onExternalDrop });
  const root = surface(300);
  root.style.width = '480px';
  const host = createCalendarInteractionHost(calendar, { scope });
  host.surface(root, timelineSurface('all'));
  cleanups.push(host.mount(root));
  const palette = surface();
  const source = child(palette, 0);
  cleanups.push(createExternalDraggable(source, () => ({ event, metadata: { palette: true } }), { scope, pointer: {} }));
  pointer(source, 'pointerdown', 20, 10);
  pointer(root, 'pointermove', 540, 20);
  pointer(root, 'pointerup', 540, 20);
  expect(onExternalDrop).toHaveBeenCalledOnce();
  expect(onExternalDrop.mock.calls[0]![0].after.start.equals(at(12))).toBe(true);
});

it('ignores touch without its feature and still accepts the following mouse gesture', () => {
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: { interactionFeature: interactionFeature(), pointerFeature: pointerFeature(), dateSelectionFeature: dateSelectionFeature() },
    }),
  });
  const onSelectionChange = vi.fn();
  const calendar = createCalendar({ ...base, ...views, onSelectionChange });
  const { root } = setup(calendar);
  pointer(root, 'pointerdown', 150, 180, 'touch');
  pointer(root, 'pointermove', 150, 220, 'touch');
  pointer(root, 'pointerup', 150, 220, 'touch');
  expect(onSelectionChange).not.toHaveBeenCalled();
  pointer(root, 'pointerdown', 150, 180);
  pointer(root, 'pointermove', 150, 220);
  pointer(root, 'pointerup', 150, 220);
  expect(onSelectionChange).toHaveBeenCalledOnce();
});

it('transports third-party operations without assuming an event or date target', async () => {
  const { eventPriorityFeature } = await import('#tests/support/priority');
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: { interactionFeature: interactionFeature(), pointerFeature: pointerFeature(), eventPriorityFeature: eventPriorityFeature() },
    }),
  });
  const onPriorityChange = vi.fn();
  const calendar = createCalendar({ ...base, ...views, onPriorityChange });
  const root = surface();
  const host = createCalendarDomHost({ api: { pointer: calendar.api.pointer, interactions: calendar.api.interactions } });
  host.surface(root, timeGridSurface(`all:${date.toString()}`));
  cleanups.push(host.mount(root));
  const source = child(root);
  host.source(
    source,
    createCalendarDomOperation<'priority'>({
      acceptsTarget: (value): value is import('#tests/support/priority').PriorityTarget =>
        !!value && typeof value === 'object' && 'kind' in value && value.kind === 'priority',
      begin: () => calendar.api.priority.begin('a', 'review'),
      target: () => ({ kind: 'priority', value: 'high' }),
    }),
  );
  pointer(source, 'pointerdown', 20, 180);
  pointer(root, 'pointermove', 20, 220);
  pointer(root, 'pointerup', 20, 220);
  expect(onPriorityChange).toHaveBeenCalledOnce();
  expect(onPriorityChange.mock.calls[0]![0]).toMatchObject({ kind: 'priority', value: 'high', reason: 'review' });
  expect('move' in calendar.api).toBe(false);
});

it('stops autoscroll at release while a controlled selection awaits acknowledgment', async () => {
  let snapshot = interactionIdle();
  const onSelectionChange = vi.fn();
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: {
        interactionFeature: interactionFeature(),
        pointerFeature: pointerFeature(),
        autoScrollFeature: autoScrollFeature(),
        dateSelectionFeature: dateSelectionFeature(),
      },
    }),
  });
  const calendar = createCalendar({
    ...base,
    ...views,
    onSelectionChange,
    autoScroll: { speed: 800, edge: 30 },
    interactionOwnership: {
      mode: 'controlled',
      read: () => snapshot,
      onChange: next => {
        window.setTimeout(() => {
          snapshot = next;
        }, 100);
      },
    },
  });
  const root = surface();
  root.style.height = '120px';
  root.style.overflowY = 'auto';
  const track = document.createElement('div');
  track.style.height = '480px';
  root.append(track);
  const host = createCalendarInteractionHost(calendar, { scope });
  host.surface(track, timeGridSurface(`all:${date.toString()}`));
  cleanups.push(host.mount(root));
  pointer(track, 'pointerdown', 150, 80);
  pointer(track, 'pointermove', 150, 115);
  await vi.waitFor(() => expect(root.scrollTop).toBeGreaterThan(10));
  pointer(track, 'pointerup', 150, 115);
  const stopped = root.scrollTop;
  await new Promise(resolve => setTimeout(resolve, 40));
  expect(root.scrollTop).toBe(stopped);
  await vi.waitFor(() => expect(onSelectionChange).toHaveBeenCalledOnce());
});

it('isolates drag scopes and uses the external source activation settings', () => {
  const firstScope = createCalendarInteractionScope();
  const secondScope = createCalendarInteractionScope();
  const onFirst = vi.fn(),
    onSecond = vi.fn();
  const views = interactionTestViews({
    day: timeGridView({
      days: 1,
      features: {
        interactionFeature: interactionFeature(),
        pointerFeature: pointerFeature({ distance: 0 }),
        externalDropFeature: externalDropFeature(),
      },
    }),
  });
  const first = createCalendar({ ...base, ...views, events: [], onExternalDrop: onFirst });
  const second = createCalendar({ ...base, ...views, events: [], onExternalDrop: onSecond });
  const firstRoot = surface(),
    secondRoot = surface(300);
  for (const [calendar, root, scope] of [
    [first, firstRoot, firstScope],
    [second, secondRoot, secondScope],
  ] as const) {
    const host = createCalendarInteractionHost(calendar, { scope });
    host.surface(root, timeGridSurface(`all:${date.toString()}`));
    cleanups.push(host.mount(root));
  }
  const palette = surface(600),
    source = child(palette, 0);
  cleanups.push(createExternalDraggable(source, () => ({ event }), { scope: secondScope, pointer: { distance: 50 } }));
  pointer(source, 'pointerdown', 610, 10);
  pointer(firstRoot, 'pointermove', 10, 240);
  pointer(firstRoot, 'pointerup', 10, 240);
  expect(onFirst).not.toHaveBeenCalled();
  expect(onSecond).not.toHaveBeenCalled();
  pointer(source, 'pointerdown', 610, 10);
  pointer(secondRoot, 'pointermove', 320, 240);
  pointer(secondRoot, 'pointerup', 320, 240);
  expect(onSecond).toHaveBeenCalledOnce();
  expect(onFirst).not.toHaveBeenCalled();
  onSecond.mockClear();
  source.style.position = 'fixed';
  source.style.left = '300px';
  source.style.top = '180px';
  pointer(source, 'pointerdown', 320, 180);
  pointer(secondRoot, 'pointermove', 320, 200);
  pointer(secondRoot, 'pointerup', 320, 200);
  expect(onSecond).not.toHaveBeenCalled();
});
