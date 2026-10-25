import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { createCalendar } from '#calendar/calendar';
import { fixedClock } from '#calendar/clock';
import { calendarFeatures } from '#features/calendar-features';
import { resourceExpansionFeature } from '#features/resource-expansion/resource-expansion-feature';
import { interactionFeature } from '#features/interaction/interaction-feature';
import { eventMoveFeature } from '#features/event-move/event-move-feature';
import { constraintsFeature } from '#features/constraints/constraints-feature';
import { calendarViews, dayGridView, listView, timeGridView, timelineView } from '#views/views';
import { fixtures_at, fixtures_resource, fixtures_timed } from '#tests/support/calendar.fixtures';
import type { Calendar_ResourceExpansion } from '#features/resource-expansion/resource-expansion.types';

const resources = [
  fixtures_resource('parent'),
  { ...fixtures_resource('child'), parentId: 'parent' },
  { ...fixtures_resource('grandchild'), parentId: 'child' },
  fixtures_resource('other'),
];
const event = fixtures_timed('booking', { date: '2026-03-11', start: '09:00', end: '10:00', resourceIds: ['grandchild', 'other'] });
const features = calendarFeatures({
  tree: resourceExpansionFeature(),
  interactions: interactionFeature(),
  move: eventMoveFeature(),
  constraints: constraintsFeature({ preventOverlap: false }),
});
const views = calendarViews({
  features,
  views: {
    timeline: timelineView({ days: 1, groupBy: 'resource' }),
    collapsed: timelineView({ days: 1, groupBy: 'resource', features: { tree: { initiallyExpanded: false } } }),
    grid: timeGridView({ days: 1, groupBy: 'resource' }),
    days: dayGridView({ days: 1, groupBy: 'resource', maxEventsPerDay: 3 }),
    list: listView({ days: 1, groupBy: 'resource' }),
  },
});
const options = {
  features,
  views,
  resources,
  view: 'timeline' as const,
  date: Temporal.PlainDate.from('2026-03-11'),
  timeZone: 'America/New_York',
  clock: fixedClock(fixtures_at('2026-03-11', '12:00').toInstant()),
  events: [event],
  onNavigate: () => {},
};
const rows = (calendar: ReturnType<typeof setup>) => {
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'timeline') throw new Error('expected timeline');
  return layout.rows;
};
const setup = () => createCalendar(options);

it('shows the full hierarchy without registering expansion', () => {
  const features = calendarFeatures({});
  const calendar = createCalendar({
    ...options,
    features,
    views: calendarViews({ features, views: { timeline: timelineView({ days: 1, groupBy: 'resource' }) } }),
  });
  expect(calendar.store.state.layout.rows.map(row => [row.key, row.depth])).toEqual([
    ['parent', 0],
    ['child', 1],
    ['grandchild', 2],
    ['other', 0],
  ]);
  expect(calendar.store.state.layout.rows[0]!.isExpanded).toBe(true);
});

it('keeps parent events, scoped backgrounds and availability independent of descendants', () => {
  const calendar = createCalendar({
    ...options,
    resources: resources.map(resource =>
      resource.id === 'parent'
        ? { ...resource, availability: [{ start: fixtures_at('2026-03-11', '00:00'), end: fixtures_at('2026-03-12', '00:00') }] }
        : resource,
    ),
    events: [
      ...options.events,
      { ...event, id: 'parent-booking', resourceIds: ['parent'] },
      { ...event, id: 'closure', display: 'background', resourceIds: ['parent'] },
    ],
  });
  expect(rows(calendar)[0]).toMatchObject({
    isUnavailable: false,
    segments: [{ event: { id: 'parent-booking' } }],
    backgroundEvents: [{ event: { id: 'closure' } }],
  });
  expect(rows(calendar)[1]).toMatchObject({ isUnavailable: true, segments: [], backgroundEvents: [] });
  calendar.api.resourceExpansion.toggle('parent');
  expect(rows(calendar)[0]!.segments.map(segment => segment.event.id)).toEqual(['parent-booking']);
});

it('isolates expansion between instances and supports IDs matching object prototype keys', () => {
  const first = setup();
  const second = setup();
  first.api.resourceExpansion.toggle('parent');
  expect(rows(second)).toHaveLength(4);
  const calendar = createCalendar({
    ...options,
    resources: [
      { ...resources[0]!, id: '__proto__' },
      { ...resources[1]!, parentId: '__proto__' },
    ],
  });
  expect(rows(calendar)).toHaveLength(2);
  calendar.api.resourceExpansion.toggle('__proto__');
  expect(rows(calendar)).toHaveLength(1);
  calendar.api.resourceExpansion.toggle('__proto__');
  expect(rows(calendar)).toHaveLength(2);
});

it('exposes hierarchy metadata and keeps events directly assigned to each resource', () => {
  const calendar = setup();
  expect(rows(calendar).map(row => [row.key, row.depth, row.hasChildren, row.isExpanded, row.segments.length])).toEqual([
    ['parent', 0, true, true, 0],
    ['child', 1, true, true, 0],
    ['grandchild', 2, false, false, 1],
    ['other', 0, false, false, 1],
  ]);
  calendar.api.resourceExpansion.toggle('parent');
  expect(rows(calendar).map(row => [row.key, row.segments.length])).toEqual([
    ['parent', 0],
    ['other', 1],
  ]);
  expect(calendar.options.events).toBe(options.events);
  expect(calendar.options.resources).toBe(resources);
});

it('remembers descendant expansion across ancestor toggles and view changes', () => {
  const calendar = setup();
  calendar.api.resourceExpansion.setExpanded('child', false);
  calendar.api.resourceExpansion.setExpanded('parent', false);
  calendar.api.resourceExpansion.setExpanded('parent', true);
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'child', 'other']);
  calendar['~update']({ ...calendar.options, view: 'grid' });
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'timeGrid') throw new Error('expected timeGrid');
  expect(layout.columns.map(column => column.resource?.id)).toEqual(['parent', 'child', 'grandchild', 'other']);
  calendar['~update']({ ...calendar.options, view: 'timeline' });
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'child', 'other']);
});

it('supports aliased factory defaults and per-view overrides', () => {
  const calendar = createCalendar({ ...options, view: 'collapsed' });
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'other']);
  calendar.api.resourceExpansion.toggle('parent');
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'child', 'other']);
  calendar['~update']({ ...calendar.options, view: 'timeline' });
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'child', 'grandchild', 'other']);
});

it('waits for controlled acknowledgment and emits only effective changes', () => {
  const onResourceExpansionChange = vi.fn();
  const calendar = createCalendar({ ...options, state: { resourceExpansion: {} }, onResourceExpansionChange });
  calendar.api.resourceExpansion.setExpanded('parent', false);
  expect(rows(calendar)).toHaveLength(4);
  expect(onResourceExpansionChange).toHaveBeenLastCalledWith({ parent: false });
  const next = onResourceExpansionChange.mock.calls[0]![0] as Calendar_ResourceExpansion;
  calendar['~update']({ ...calendar.options, state: { resourceExpansion: next } });
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'other']);
  calendar.api.resourceExpansion.setExpanded('parent', false);
  calendar.api.resourceExpansion.toggle('grandchild');
  expect(onResourceExpansionChange).toHaveBeenCalledTimes(1);
  expect(() => calendar.api.resourceExpansion.toggle('missing')).toThrow(/unknown resource/);
});

it('uses external expansion atoms for actions and direct updates', () => {
  const atom = createStore<Calendar_ResourceExpansion>({ parent: false });
  const calendar = createCalendar({ ...options, atoms: { resourceExpansion: atom } });
  expect(rows(calendar)).toHaveLength(2);
  calendar.api.resourceExpansion.toggle('parent');
  expect(atom.state).toEqual({ parent: true });
  expect(rows(calendar)).toHaveLength(4);
  atom.setState(() => ({ child: false }));
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'child', 'other']);
});

it('keeps day-grid and agenda ordering independent of timeline collapse', () => {
  const calendar = setup();
  calendar.api.resourceExpansion.toggle('parent');
  calendar['~update']({ ...calendar.options, view: 'days' });
  const days = calendar.store.state.layout;
  if (days.kind !== 'dayGrid') throw new Error('expected dayGrid');
  expect(days.sections[0]!.columns.map(column => column.resource?.id)).toEqual(['parent', 'child', 'grandchild', 'other']);
  calendar['~update']({ ...calendar.options, view: 'list' });
  const list = calendar.store.state.layout;
  if (list.kind !== 'list') throw new Error('expected list');
  expect(list.sections.map(section => section.resource?.id)).toEqual(['grandchild', 'other']);
});

it('retains overrides by ID when resources are reordered, reparented or replaced', () => {
  const calendar = setup();
  calendar.api.resourceExpansion.setExpanded('child', false);
  calendar['~update']({ ...calendar.options, resources: [resources[3]!, resources[1]!, { ...resources[2]!, parentId: 'parent' }, resources[0]!] });
  expect(rows(calendar).map(row => row.key)).toEqual(['other', 'parent', 'child', 'grandchild']);
  expect(rows(calendar).find(row => row.key === 'child')).toMatchObject({ hasChildren: false, isExpanded: false });
  calendar['~update']({ ...calendar.options, resources });
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'child', 'other']);
  expect(() => calendar['~update']({ ...calendar.options, resources: [{ ...resources[1]!, parentId: 'missing' }] })).toThrow(/missing parent/);
  expect(rows(calendar).map(row => row.key)).toEqual(['parent', 'child', 'other']);
});

it('matches hit detection and event previews to visible rows, including active previews', () => {
  const calendar = setup();
  const session = calendar.api.move.begin('booking');
  if (session.status !== 'active') throw new Error('expected active move');
  const updated = session.session.update({ kind: 'timed', at: fixtures_at('2026-03-11', '11:00'), resourceId: 'grandchild' });
  expect(updated.status).toBe('valid');
  const proposal = calendar.api.interactions.store.state.candidate;
  if (proposal?.status !== 'valid') throw new Error('expected proposal');
  expect(calendar.api.interactions.project(proposal.proposal)).toMatchObject({ geometry: [{ surface: 'lane:grandchild' }] });
  calendar.api.resourceExpansion.toggle('parent');
  expect(calendar.api.interactions.locate({ kind: 'timeline', surface: { kind: 'lane', key: 'grandchild' }, fraction: 0.5 }).status).toBe(
    'unavailable',
  );
  expect(calendar.api.interactions.project(proposal.proposal)).toMatchObject({ geometry: [] });
  expect(calendar.api.interactions.store.state.preview).toMatchObject({ geometry: [] });
  calendar.api.resourceExpansion.toggle('parent');
  expect(calendar.api.interactions.store.state.preview).toMatchObject({ geometry: [{ surface: 'lane:grandchild' }] });
  session.session.cancel();
});

it('keeps collapsed resources in availability and overlap validation', () => {
  const calendar = createCalendar({ ...options, constraints: { resourceAvailability: true, preventOverlap: true } });
  calendar.api.resourceExpansion.toggle('parent');
  const target = { kind: 'timed' as const, at: fixtures_at('2026-03-11', '11:00'), resourceId: 'grandchild' };
  expect(calendar.api.move.evaluate('booking', target)).toMatchObject({ status: 'rejected', reason: 'resource-unavailable' });
  const available = resources.map(resource => ({
    ...resource,
    availability: [{ start: fixtures_at('2026-03-11', '00:00'), end: fixtures_at('2026-03-12', '00:00') }],
  }));
  calendar['~update']({ ...calendar.options, resources: available });
  expect(calendar.api.move.evaluate('booking', target).status).toBe('valid');
  calendar['~update']({
    ...calendar.options,
    events: [...options.events, { ...event, id: 'busy', start: target.at, end: target.at.add({ hours: 1 }) }],
  });
  expect(calendar.api.move.evaluate('booking', target)).toMatchObject({ status: 'rejected', reason: 'overlap' });
});
