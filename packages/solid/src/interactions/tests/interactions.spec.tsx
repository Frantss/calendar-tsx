import { calendarFeatures, calendarViews } from '@calendar-tsx/core';
/* oxlint-disable react/refs -- These bindings expose callback refs, not React mutable ref objects. */
import { onMount } from 'solid-js';
import { tests_render } from '#tests/support/render';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createCalendar, timeGridView, timelineView, interactionFeature, pointerFeature, eventResizeFeature } from '@calendar-tsx/core';
import { timeGridSurface, timelineSurface } from '@calendar-tsx/core';
import { useCalendar } from '#calendar/calendar';
import { useCalendarInteractions } from '#interactions/use-calendar-interactions';
const date = Temporal.PlainDate.from('2026-10-23');
const at = (hour: number) => date.toZonedDateTime({ timeZone: 'UTC', plainTime: `${String(hour).padStart(2, '0')}:00` });
const event = { id: 'a', kind: 'timed' as const, start: at(9), end: at(10), data: { title: 'A' } };
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
for (const layout of ['grid', 'timeline'] as const) {
  it(`binds independent resizing to production ${layout} surfaces and previews`, async () => {
    const features = calendarFeatures({
      interactionFeature: interactionFeature(),
      pointerFeature: pointerFeature(),
      eventResizeFeature: eventResizeFeature(),
    });
    const views = {
      features,
      views: calendarViews({ features, views: { day: layout === 'grid' ? timeGridView({ days: 1 }) : timelineView({ days: 1 }) } }),
    };
    const onEventResize = vi.fn();
    const options = { ...views, view: 'day' as const, date, timeZone: 'UTC', events: [event], onNavigate: () => {}, onEventResize };
    let instance: ReturnType<typeof createCalendar<typeof event.data, unknown, typeof views.views, typeof views.features>>;
    const Harness = () => {
      const calendar = useCalendar(() => options);
      const bindings = useCalendarInteractions(calendar);
      onMount(() => {
        // oxlint-disable-next-line react/globals -- Solid onMount runs after rendering.
        instance = calendar;
      });
      return (
        <div ref={bindings.root} style={{ position: 'fixed', left: '0', top: '0', width: '480px', height: '480px' }}>
          <div
            data-testid='surface'
            ref={bindings.surface(layout === 'grid' ? timeGridSurface(`all:${date.toString()}`) : timelineSurface('all'))}
            style={{ width: '100%', height: '100%' }}
          >
            <button
              data-testid='handle'
              ref={bindings.source('end', { eventId: 'a', edge: 'end' })}
              style={{ position: 'absolute', left: '180px', top: '180px', width: '20px', height: '20px' }}
            >
              Resize
            </button>
          </div>
          <output>{bindings.preview()?.status ?? 'idle'}</output>
        </div>
      );
    };
    const screen = tests_render(() => <Harness />);
    const surface = document.querySelector('[data-testid="surface"]')!;
    const handle = document.querySelector('[data-testid="handle"]')!;
    pointer(handle, 'pointerdown', 190, 190);
    pointer(surface, 'pointermove', layout === 'grid' ? 190 : 240, layout === 'grid' ? 240 : 190);
    await vi.waitFor(() => expect(document.querySelector('output')?.textContent).toBe('valid'));
    pointer(surface, 'pointerup', layout === 'grid' ? 190 : 240, layout === 'grid' ? 240 : 190);
    expect(onEventResize).toHaveBeenCalledOnce();
    expect(onEventResize.mock.calls[0]![0].after.end.equals(at(12))).toBe(true);
    await userEvent.dragAndDrop(handle, surface, { targetPosition: { x: layout === 'grid' ? 190 : 240, y: layout === 'grid' ? 240 : 190 } });
    expect(onEventResize).toHaveBeenCalledTimes(2);
    expect(onEventResize.mock.calls[1]![0].after.end.equals(at(12))).toBe(true);
    expect('move' in instance!.api).toBe(false);
    expect('selection' in instance!.api).toBe(false);
    pointer(handle, 'pointerdown', 190, 190);
    pointer(surface, 'pointermove', 240, 240);
    screen.unmount();
    expect(instance!.api.interactions.store.state.session).toBeNull();
    expect(instance!.options.events[0]).toBe(event);
  });
}
