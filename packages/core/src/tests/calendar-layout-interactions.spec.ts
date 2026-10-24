import { interactionTestViews } from './interaction.setup';
import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';
import { createCalendar } from '#calendar/calendar';
import { fixedClock } from '#calendar/clock';
import { timeGridView, timelineView, listView } from '#views/views';
import { timeGridLayout, timelineLayout } from '#layouts/layout-features';
import { interactionFeature, interactionIdle, createInteractionOperation } from '#calendar-interactions';
import { dateSelectionFeature, eventMoveFeature, eventResizeFeature, constraintsFeature } from '#calendar-editing';
import type { Calendar_DateTarget } from '#calendar-editing';
import type { Calendar_InteractionSnapshot, Calendar_InteractionStart } from '#calendar-interaction.types';
import type { Calendar_LayoutLocation, Calendar_LayoutProjection } from '#calendar-layout-interaction.types';
import type { Calendar_LayoutFeature } from '#features/feature.types';
import type { Calendar_InteractionContribution } from '#calendar-interaction.types';

const date = Temporal.PlainDate.from('2026-10-23');
const at = (time: string, day = date, zone = 'UTC') => Temporal.ZonedDateTime.from(`${day.toString()}T${time}[${zone}]`);
const target = (time: string) => ({ kind: 'timed' as const, at: at(time), resourceId: 'a' });
const event = { id: 'event', kind: 'timed' as const, start: at('09:00'), end: at('10:00'), resourceIds: ['a'], data: { title: 'Event' } };
const features = {
  interactionFeature: interactionFeature(),
  dateSelectionFeature: dateSelectionFeature(),
  eventMoveFeature: eventMoveFeature(),
  eventResizeFeature: eventResizeFeature(),
  constraintsFeature: constraintsFeature(),
};
const views = interactionTestViews({
  grid: timeGridView({ days: 2, groupBy: 'resource', groupOrder: 'date-first', features }),
  timeline: timelineView({ days: 2, groupBy: 'resource', features }),
  list: listView({ days: 2, features }),
});
const base = {
  ...views,
  date,
  timeZone: 'UTC',
  view: 'grid' as const,
  events: [event],
  resources: ['a', 'b'].map(id => ({ id, title: id, data: null, availability: [] })),
  constraints: { preventOverlap: false },
  clock: fixedClock(at('12:00').toInstant()),
  onNavigate: () => {},
};
const tokenOf = (result: Calendar_InteractionStart) => {
  if (result.status !== 'active') throw new Error(result.status);
  return result.token;
};
const geometryOf = (result: Calendar_LayoutProjection) => {
  if (result.status !== 'valid' || (result.kind !== 'timeGrid' && result.kind !== 'timeline')) throw new Error('expected date geometry');
  return result.geometry;
};
const targetOf = (result: Calendar_LayoutLocation<'timeGrid' | 'timeline'>) => {
  if (result.status !== 'valid') throw new Error(result.reason);
  return result.target;
};

it('locates snapped dates and resources using the active layout and its defaults', () => {
  const calendar = createCalendar(base);
  const point = { kind: 'timeGrid' as const, surface: { kind: 'column' as const, key: `b:${date.toString()}` }, fraction: 9.2 / 24 };
  const located = calendar.api.interactions.locate(point);
  if (located.status === 'valid') expectTypeOf(located.target).toEqualTypeOf<Calendar_DateTarget>();
  expect(targetOf(located).at.equals(at('09:00'))).toBe(true);
  expect(targetOf(located).resourceId).toBe('b');
  expect(targetOf(calendar.api.interactions.locate({ ...point, fraction: 9.3 / 24 })).at.equals(at('09:30'))).toBe(true);
  calendar['~update']({ ...calendar.options, view: 'timeline' });
  const lane = { kind: 'timeline' as const, surface: { kind: 'lane' as const, key: 'a' }, fraction: 33.4 / 48 };
  const next = targetOf(calendar.api.interactions.locate(lane));
  expect(next.at.equals(at('09:00', date.add({ days: 1 })))).toBe(true);
  expect(next.resourceId).toBe('a');
  expect(calendar.api.interactions.locate(point)).toEqual({ status: 'unavailable', reason: 'different-layout' });
});

it('rejects invalid surfaces and fractions, and honors absent all-day surfaces', () => {
  const calendar = createCalendar(base);
  const point = { kind: 'timeGrid' as const, surface: { kind: 'column' as const, key: `a:${date.toString()}` }, fraction: 0 };
  for (const fraction of [-0.01, 1.01, NaN, Infinity])
    expect(calendar.api.interactions.locate({ ...point, fraction })).toEqual({ status: 'unavailable', reason: 'outside-surface' });
  expect(targetOf(calendar.api.interactions.locate({ ...point, fraction: 1 })).at.equals(at('00:00', date.add({ days: 1 })))).toBe(true);
  expect(calendar.api.interactions.locate({ ...point, surface: { kind: 'column', key: 'missing' } }).status).toBe('unavailable');
  expect(calendar.api.interactions.locate({ ...point, dateKind: 'allDay' }).status).toBe('unavailable');
  const without = interactionTestViews({ grid: timeGridView({ days: 1, allDay: false, features }) });
  const noAllDay = createCalendar({ ...base, ...without });
  expect(noAllDay.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'allDay' }, fraction: 0 }).status).toBe('unavailable');
  const empty = createCalendar({ ...base, resources: [] });
  expect(empty.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'allDay' }, fraction: 0 }).status).toBe('unavailable');
});

it('locates inclusive all-day dates in date-first resource columns and timeline lanes', () => {
  const calendar = createCalendar(base);
  const selected = targetOf(calendar.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'allDay' }, fraction: 0.875 }));
  if (selected.kind !== 'allDay') throw new Error('expected all-day');
  expect(selected.at.equals(date.add({ days: 1 }))).toBe(true);
  expect(selected.resourceId).toBe('b');
  calendar['~update']({ ...calendar.options, view: 'timeline' });
  const end = targetOf(calendar.api.interactions.locate({ kind: 'timeline', surface: { kind: 'lane', key: 'b' }, fraction: 1, dateKind: 'allDay' }));
  if (end.kind !== 'allDay') throw new Error('expected all-day');
  expect(end.at.equals(date.add({ days: 1 }))).toBe(true);
});

for (const view of ['grid', 'timeline'] as const) {
  it(`derives selection, movement and independent resize previews in ${view} without base builds`, () => {
    const gridBuild = vi.fn(timeGridLayout.build);
    const timelineBuild = vi.fn(timelineLayout.build);
    const calendar = createCalendar({
      ...base,
      view,
      views: {
        ...base.views,
        grid: { ...base.views.grid, '~features': { ...base.views.grid['~features'], timeGridLayout: { ...timeGridLayout, build: gridBuild } } },
        timeline: {
          ...base.views.timeline,
          '~features': { ...base.views.timeline['~features'], timelineLayout: { ...timelineLayout, build: timelineBuild } },
        },
      },
    });
    const model = calendar.store.state.layout;
    const count = gridBuild.mock.calls.length + timelineBuild.mock.calls.length;
    const baseChanged = vi.fn();
    const subscription = calendar.store.subscribe(baseChanged);
    let token = tokenOf(calendar.api.selection.begin(target('10:00')));
    calendar.api.interactions.update(token, target('11:00'));
    const selected = geometryOf(calendar.api.interactions.store.state.preview!);
    expect(selected).toHaveLength(1);
    expect(selected[0]!.start).toBeCloseTo(10 / (view === 'grid' ? 24 : 48));
    expect(selected[0]!.span).toBeCloseTo(1 / (view === 'grid' ? 24 : 48));
    calendar.api.interactions.cancel(token);
    expect(calendar.api.interactions.store.state.preview).toBeNull();
    token = tokenOf(calendar.api.move.begin('event'));
    calendar.api.interactions.update(token, target('11:00'));
    expect(geometryOf(calendar.api.interactions.store.state.preview!)[0]!.start).toBeCloseTo(11 / (view === 'grid' ? 24 : 48));
    calendar.api.interactions.cancel(token);
    token = tokenOf(calendar.api.resize.begin('event', 'end'));
    calendar.api.interactions.update(token, target('12:00'));
    expect(geometryOf(calendar.api.interactions.store.state.preview!)[0]!.span).toBeCloseTo(3 / (view === 'grid' ? 24 : 48));
    const snapshot = calendar.api.interactions.store.state;
    expect(calendar.api.interactions.update(token, target('12:00'))).toBe('unchanged');
    expect(calendar.api.interactions.store.state).toBe(snapshot);
    expect(calendar.store.state.layout).toBe(model);
    expect(gridBuild.mock.calls.length + timelineBuild.mock.calls.length).toBe(count);
    expect(baseChanged).not.toHaveBeenCalled();
    calendar.api.interactions.update(token, target('08:00'));
    expect(calendar.api.interactions.store.state.preview).toBeNull();
    calendar.api.interactions.cancel(token);
    subscription.unsubscribe();
    const only = interactionTestViews({
      only:
        view === 'grid'
          ? timeGridView({ days: 1, features: { interactionFeature: interactionFeature(), eventResizeFeature: eventResizeFeature() } })
          : timelineView({ days: 1, features: { interactionFeature: interactionFeature(), eventResizeFeature: eventResizeFeature() } }),
    });
    const independent = createCalendar({ ...base, ...only, view: 'only' });
    const resize = tokenOf(independent.api.resize.begin('event', 'end'));
    independent.api.interactions.update(resize, target('12:00'));
    expect(geometryOf(independent.api.interactions.store.state.preview!)).toHaveLength(1);
    expect('selection' in independent.api).toBe(false);
    expect('move' in independent.api).toBe(false);
  });

  it(`matches committed ${view} geometry for short, overnight, clipped and all-day events`, () => {
    for (const nextEvent of [
      { ...event, start: at('11:00'), end: at('11:02') },
      { ...event, start: at('23:30'), end: at('01:00', date.add({ days: 1 })) },
      { ...event, start: at('23:00', date.subtract({ days: 1 })), end: at('01:00') },
      { ...event, kind: 'allDay' as const, start: date, end: date.add({ days: 2 }) },
    ]) {
      const calendar = createCalendar({ ...base, view });
      const projected = geometryOf(calendar.api.interactions.project({ kind: 'move', before: event, after: nextEvent }));
      const committed = createCalendar({ ...base, view, events: [nextEvent] }).store.state.layout;
      const segments =
        committed.kind === 'timeGrid'
          ? [
              ...committed.columns.flatMap(column =>
                column.segments.map(segment => ({ surface: `column:${column.key}`, start: segment.start, span: segment.span })),
              ),
              ...(committed.allDay?.segments.map(segment => ({
                surface: 'allDay',
                start: segment.colStart / committed.columns.length,
                span: segment.colSpan / committed.columns.length,
              })) ?? []),
            ]
          : committed.kind === 'timeline'
            ? committed.rows.flatMap(row => row.segments.map(segment => ({ surface: `lane:${row.key}`, start: segment.start, span: segment.span })))
            : [];
      expect(projected.map(({ surface, start, span }) => ({ surface, start, span }))).toEqual(segments);
    }
  });
}

it('projects selection across midnight and inclusive all-day resource columns without fabricated event data', () => {
  const calendar = createCalendar(base);
  const timed = geometryOf(
    calendar.api.interactions.project({
      kind: 'select',
      range: { kind: 'timed', start: at('23:00'), end: at('01:00', date.add({ days: 1 })), resourceIds: ['a'] },
    }),
  );
  expect(timed.map(part => part.surface)).toEqual([`column:a:${date.toString()}`, `column:a:${date.add({ days: 1 }).toString()}`]);
  expect(timed.map(part => part.span)).toEqual([1 / 24, 1 / 24]);
  const allDay = geometryOf(
    calendar.api.interactions.project({ kind: 'select', range: { kind: 'allDay', start: date, end: date.add({ days: 1 }), resourceIds: ['b'] } }),
  );
  expect(allDay).toEqual([
    { surface: 'allDay', start: 0.25, span: 0.25 },
    { surface: 'allDay', start: 0.75, span: 0.25 },
  ]);
  expect(allDay.some(part => 'event' in part || 'data' in part)).toBe(false);
});

it('returns unavailable for missing capabilities while semantic operations still work', () => {
  const calendar = createCalendar({ ...base, view: 'list' });
  expect(calendar.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'allDay' }, fraction: 0 })).toEqual({
    status: 'unavailable',
    reason: 'locate-unsupported',
  });
  const token = tokenOf(calendar.api.move.begin('event'));
  calendar.api.interactions.update(token, target('11:00'));
  expect(calendar.api.interactions.store.state.preview).toEqual({ status: 'unavailable', reason: 'project-unsupported' });
  expect(calendar.api.interactions.commit(token)).toBe('committed');
  expect(calendar.api.interactions.store.state.preview).toBeNull();
});

for (const mode of ['internal', 'controlled', 'external'] as const) {
  it(`derives previews locally with ${mode} ownership and refreshes layout settings`, () => {
    let semantic = interactionIdle();
    const atom = createStore(semantic);
    const ownerChanged = vi.fn((next: Calendar_InteractionSnapshot) => {
      semantic = next;
    });
    const ownership =
      mode === 'controlled' ? { mode, read: () => semantic, onChange: ownerChanged } : mode === 'external' ? { mode, atom } : { mode };
    const calendar = createCalendar({ ...base, interactionOwnership: ownership });
    const token = tokenOf(calendar.api.resize.begin('event', 'end'));
    calendar.api.interactions.update(token, target('09:02'));
    expect(geometryOf(calendar.api.interactions.store.state.preview!)[0]!.span).toBeCloseTo(15 / 1440);
    calendar['~update']({ ...calendar.options, views: { ...base.views, grid: { ...base.views.grid, minEventMinutes: 45 } } });
    expect(geometryOf(calendar.api.interactions.store.state.preview!)[0]!.span).toBeCloseTo(45 / 1440);
    expect('preview' in semantic).toBe(false);
    expect('preview' in atom.state).toBe(false);
    expect(ownerChanged.mock.calls.every(([next]) => !('preview' in next))).toBe(true);
    calendar['~update']({ ...calendar.options, constraints: { preventOverlap: true }, events: [event, { ...event, id: 'block' }] });
    expect(calendar.api.interactions.store.state.candidate?.status).toBe('rejected');
    expect(calendar.api.interactions.store.state.preview).toBeNull();
    calendar['~update']({ ...calendar.options, view: 'timeline' });
    expect(calendar.api.interactions.store.state.session).toBeNull();
    expect(calendar.api.interactions.store.state.preview).toBeNull();
  });
}

for (const [day, zone, gap, fold, offset] of [
  ['2026-03-08', 'America/New_York', '02:30', null, null],
  ['2026-11-01', 'America/New_York', null, '01:30', '-05:00'],
  ['2026-10-04', 'Australia/Lord_Howe', '02:15', null, null],
  ['2026-04-05', 'Australia/Lord_Howe', null, '01:45', '+10:30'],
] as const) {
  for (const view of ['grid', 'timeline'] as const) {
    it(`resolves and projects D40 clocks in ${view} on ${day} in ${zone}`, () => {
      const dayDate = Temporal.PlainDate.from(day);
      const dstViews = interactionTestViews({
        grid: timeGridView({ days: 1, slotMinutes: 15, features }),
        timeline: timelineView({ days: 1, slotMinutes: 15, features }),
      });
      const calendar = createCalendar({ ...base, ...dstViews, date: dayDate, timeZone: zone, view, events: [] });
      const locate = (time: string, sourceOffset?: string) => {
        const clock = Temporal.PlainTime.from(time);
        const fraction = (clock.hour * 60 + clock.minute) / 1440;
        return view === 'grid'
          ? calendar.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'column', key: `all:${day}` }, fraction, offset: sourceOffset })
          : calendar.api.interactions.locate({ kind: 'timeline', surface: { kind: 'lane', key: 'all' }, fraction, offset: sourceOffset });
      };
      if (gap) expect(locate(gap)).toMatchObject({ status: 'unavailable', reason: 'nonexistent-time', candidates: [] });
      if (fold) {
        const earlier = locate(fold);
        const later = locate(fold, offset!);
        if (earlier.status !== 'valid' || later.status !== 'valid') throw new Error('expected fold choices');
        expect(earlier.candidates).toHaveLength(2);
        expect(later.target.kind).toBe('timed');
        if (later.target.kind === 'timed') expect(later.target.at.offset).toBe(offset);
        expect(Temporal.ZonedDateTime.compare(earlier.target.at as Temporal.ZonedDateTime, later.target.at as Temporal.ZonedDateTime)).toBeLessThan(
          0,
        );
      }
      const start = at('09:00', dayDate, zone);
      const end = at('10:00', dayDate, zone);
      const preview = geometryOf(calendar.api.interactions.project({ kind: 'select', range: { kind: 'timed', start, end } }));
      expect(preview[0]!.start).toBeCloseTo(9 / 24);
      expect(preview[0]!.span).toBeCloseTo(1 / 24);
    });
  }
}

type MatrixModel = { kind: 'matrix'; cells: number; eventCount: number };
declare module '#features/feature-maps.types' {
  interface Calendar_Layout_FeatureMap<TData, TResourceData, TFeatures> {
    matrixLayout: MatrixModel;
  }
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    markingFeature: { mark: () => Calendar_InteractionStart };
  }
}
declare module '#calendar-layout-interaction.types' {
  interface Calendar_LayoutInteractionMap {
    matrix: { point: { kind: 'matrix'; index: number }; target: boolean; geometry: { marked: number; active: boolean } };
  }
}
declare module '#calendar-interaction.types' {
  interface Calendar_OperationMap<TData> {
    markCell: { intent: { kind: 'markCell' }; target: boolean; proposal: { kind: 'markCell'; active: boolean } };
  }
}
const matrixLayout: Calendar_LayoutFeature<'matrix', {}, MatrixModel> = {
  kind: 'matrix',
  period: (date: Temporal.PlainDate) => ({ start: date, end: date }),
  range: (period: { start: Temporal.PlainDate; end: Temporal.PlainDate }) => period,
  step: (date: Temporal.PlainDate) => date,
  build: input => ({ kind: 'matrix', cells: 4, eventCount: input.events.length }),
  locate: ({ model }, point) =>
    point.index >= 0 && point.index < model.cells
      ? { status: 'valid', kind: 'matrix', target: point.index % 2 === 1 }
      : { status: 'unavailable', reason: 'missing-cell' },
  project: ({ model, input }, proposal) =>
    proposal.kind === 'markCell'
      ? { status: 'valid', kind: 'matrix', geometry: { marked: model.cells + input.events.length, active: proposal.active } }
      : { status: 'unavailable', reason: 'unsupported-proposal' },
};
const marking: Calendar_InteractionContribution = {
  operation: createInteractionOperation({
    kind: 'markCell',
    acceptsTarget: (target): target is boolean => typeof target === 'boolean',
    create: (_intent, active) => ({ status: 'valid', proposal: { kind: 'markCell', active } }),
    api: commands => ({ mark: () => commands.begin({ kind: 'markCell' }) }),
  }),
};

it('dispatches third-party points, primitive targets and custom preview geometry without runtime edits', () => {
  const custom = {
    kind: 'matrix',
    '~layout': 'matrixLayout',
    '~features': {
      matrixLayout,
      interactionFeature: interactionFeature(),
      markingFeature: { '~id': 'markingFeature', '~config': {}, requires: ['interactionFeature'], interaction: marking },
    },
  } as const;
  const customViews = interactionTestViews({ custom });
  const calendar = createCalendar({ ...base, ...customViews, view: 'custom' });
  const located = calendar.api.interactions.locate({ kind: 'matrix', index: 0 });
  if (located.status !== 'valid') throw new Error(located.reason);
  expectTypeOf(located.target).toEqualTypeOf<boolean>();
  expect(located.target).toBe(false);
  expect(calendar.api.interactions.locate({ kind: 'matrix', index: 4 })).toEqual({ status: 'unavailable', reason: 'missing-cell' });
  // @ts-expect-error custom layouts retain their point contract
  calendar.api.interactions.locate({ kind: 'matrix', index: 'wrong' });
  const initial = calendar.api.interactions.project({ kind: 'markCell', active: true });
  expect(initial).toEqual({ status: 'valid', kind: 'matrix', geometry: { marked: 5, active: true } });
  if (initial.status === 'valid' && initial.kind === 'matrix') expectTypeOf(initial.geometry.active).toEqualTypeOf<boolean>();
  const token = tokenOf(calendar.api.mark());
  calendar.api.interactions.update(token, located.target);
  expect(calendar.api.interactions.store.state.preview).toEqual({ status: 'valid', kind: 'matrix', geometry: { marked: 5, active: false } });
  calendar['~update']({ ...calendar.options, events: [...base.events, { ...event, id: 'second' }] });
  expect(calendar.api.interactions.store.state.preview).toEqual({ status: 'valid', kind: 'matrix', geometry: { marked: 6, active: false } });
  calendar.api.interactions.cancel(token);
  expect(calendar.api.interactions.store.state.preview).toBeNull();
  const project = vi.fn(matrixLayout.project!);
  const replacement = createCalendar({
    ...base,
    ...customViews,
    view: 'custom',
    views: {
      custom: { ...customViews.views.custom, '~features': { ...customViews.views.custom['~features'], matrixLayout: { ...matrixLayout, project } } },
    },
  });
  replacement.api.interactions.project({ kind: 'markCell', active: false });
  expect(project).toHaveBeenCalledOnce();
});

it('projects transition-crossing selections with the same envelope as real events', () => {
  for (const [start, end, zone] of [
    ['2026-03-08T01:30-05:00', '2026-03-08T03:30-04:00', 'America/New_York'],
    ['2026-11-01T01:30-04:00', '2026-11-01T01:15-05:00', 'America/New_York'],
    ['2026-04-05T01:50+11:00', '2026-04-05T01:40+10:30', 'Australia/Lord_Howe'],
  ]) {
    const crossing = { ...event, start: Temporal.ZonedDateTime.from(`${start}[${zone}]`), end: Temporal.ZonedDateTime.from(`${end}[${zone}]`) };
    for (const view of ['grid', 'timeline'] as const) {
      const calendar = createCalendar({ ...base, date: crossing.start.toPlainDate(), timeZone: zone!, view, events: [crossing] });
      const preview = geometryOf(
        calendar.api.interactions.project({ kind: 'select', range: { kind: 'timed', start: crossing.start, end: crossing.end, resourceIds: ['a'] } }),
      );
      const layout = calendar.store.state.layout;
      const segment =
        layout.kind === 'timeGrid' ? layout.columns[0]!.segments[0] : layout.kind === 'timeline' ? layout.rows[0]!.segments[0] : undefined;
      expect(segment).toBeDefined();
      expect(preview[0]!.start).toBeCloseTo(segment!.start);
      expect(preview[0]!.span).toBeCloseTo(segment!.span);
    }
  }
});

it('keeps inclusive all-day previews on date boundaries when midnight is nonexistent', () => {
  const day = Temporal.PlainDate.from('2026-09-06');
  const calendar = createCalendar({ ...base, date: day, timeZone: 'America/Santiago', view: 'timeline' });
  const geometry = geometryOf(
    calendar.api.interactions.project({ kind: 'select', range: { kind: 'allDay', start: day, end: day, resourceIds: ['a'] } }),
  );
  expect(geometry).toEqual([{ surface: 'lane:a', start: 0, span: 0.5 }]);
});

for (const view of ['grid', 'timeline'] as const) {
  it(`locates and projects visible overnight windows across hidden dates in ${view}`, () => {
    const settings = {
      days: 4,
      hiddenDays: [6, 7] as const,
      timeWindow: { startMinutes: 1320, endMinutes: 1800 },
      slotMinutes: 45,
      features,
    };
    const configured = interactionTestViews({
      grid: timeGridView(settings),
      timeline: timelineView(settings),
    });
    const calendar = createCalendar({ ...base, ...configured, view, events: [] });
    const fraction = view === 'grid' ? 0.5 : 0.75;
    const monday = date.add({ days: 3 });
    const hit =
      view === 'grid'
        ? calendar.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'column', key: `all:${monday}` }, fraction })
        : calendar.api.interactions.locate({ kind: 'timeline', surface: { kind: 'lane', key: 'all' }, fraction });
    expect(targetOf(hit).at.equals(at('01:45', monday.add({ days: 1 })))).toBe(true);
    const end =
      view === 'grid'
        ? calendar.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'column', key: `all:${monday}` }, fraction: 1 })
        : calendar.api.interactions.locate({ kind: 'timeline', surface: { kind: 'lane', key: 'all' }, fraction: 1 });
    expect(targetOf(end).at.equals(at('06:00', monday.add({ days: 1 })))).toBe(true);
    const range = { kind: 'timed' as const, start: at('23:00'), end: at('01:00', date.add({ days: 1 })) };
    const geometry = geometryOf(calendar.api.interactions.project({ kind: 'select', range }));
    expect(geometry).toHaveLength(1);
    expect(geometry[0]!.start).toBeCloseTo(view === 'grid' ? 1 / 8 : 1 / 16);
    expect(geometry[0]!.span).toBeCloseTo(view === 'grid' ? 2 / 8 : 2 / 16);
    const moved = { ...event, ...range, resourceIds: undefined };
    const preview = geometryOf(calendar.api.interactions.project({ kind: 'move', before: event, after: moved }));
    const committed = createCalendar({ ...base, ...configured, view, events: [moved] }).store.state.layout;
    const segment = committed.kind === 'timeGrid' ? committed.columns[0]!.segments[0]! : committed.rows[0]!.segments[0]!;
    expect(preview[0]!.start).toBe(segment.start);
    expect(preview[0]!.span).toBe(segment.span);
  });
}
