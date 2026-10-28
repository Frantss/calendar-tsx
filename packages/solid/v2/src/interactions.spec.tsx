import { Temporal } from 'temporal-polyfill';
import { onSettled } from 'solid-js';
/* oxlint-disable react/refs -- Solid bindings expose callback refs. */
import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import {
  calendarFeatures,
  calendarViews,
  eventResizeFeature,
  fixedClock,
  interactionFeature,
  pointerFeature,
  timeGridSurface,
  timeGridView,
} from '@calendar-tsx/core';
import { useCalendar, useCalendarInteractionBindings } from '@calendar-tsx/solid/v2';
import { tests_render } from './test-support';

const date = Temporal.PlainDate.from('2026-10-27');
const at = (hour: number) => date.toZonedDateTime({ timeZone: 'UTC', plainTime: `${String(hour).padStart(2, '0')}:00` });
const pointer = (element: Element, type: string, x: number, y: number) =>
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
    }),
  );

it('binds resize gestures, updates previews, and cancels the active session on disposal', async () => {
  const features = calendarFeatures({
    interactions: interactionFeature(),
    pointer: pointerFeature(),
    resize: eventResizeFeature(),
  });
  const onEventResize = vi.fn();
  const options = {
    features,
    views: calendarViews({ features, views: { day: timeGridView({ days: 1 }) } }),
    view: 'day' as const,
    date,
    timeZone: 'UTC',
    clock: fixedClock(at(12).toInstant()),
    events: [{ id: 'a', kind: 'timed' as const, start: at(9), end: at(10), data: null }],
    onNavigate: () => {},
    onEventResize,
  };
  const create = () => useCalendar(() => options);
  let calendar: ReturnType<typeof create> | undefined;
  const Harness = () => {
    const instance = create();
    onSettled(() => {
      // oxlint-disable-next-line react/globals -- Keep the mounted instance for disposal assertions.
      calendar = instance;
    });
    const bindings = useCalendarInteractionBindings(instance);
    return (
      <div ref={bindings.root} style={{ position: 'fixed', left: '0', top: '0', width: '480px', height: '480px' }}>
        <div data-testid='surface' ref={bindings.surface(timeGridSurface(`all:${date.toString()}`))} style={{ width: '100%', height: '100%' }}>
          <button ref={bindings.source('end', { eventId: 'a', edge: 'end' })}>Resize</button>
        </div>
        <output>{bindings.preview()?.status ?? 'idle'}</output>
      </div>
    );
  };
  const screen = tests_render(() => <Harness />);
  const handle = page.getByRole('button', { name: 'Resize' }).element();
  const surface = screen.container.querySelector('[data-testid="surface"]')!;
  pointer(handle, 'pointerdown', 190, 190);
  pointer(surface, 'pointermove', 190, 240);
  await expect.element(page.getByRole('status')).toHaveTextContent('valid');
  pointer(surface, 'pointerup', 190, 240);
  expect(onEventResize).toHaveBeenCalledOnce();
  expect(onEventResize.mock.calls[0]![0].after.end.equals(at(12))).toBe(true);
  pointer(handle, 'pointerdown', 190, 190);
  pointer(surface, 'pointermove', 190, 240);
  await expect.element(page.getByRole('status')).toHaveTextContent('valid');
  screen.unmount();
  expect(calendar!.api.interactions.store.state.session).toBeNull();
  pointer(surface, 'pointerup', 190, 240);
  expect(onEventResize).toHaveBeenCalledOnce();
});
