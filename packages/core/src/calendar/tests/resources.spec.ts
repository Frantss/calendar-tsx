import { expect, it } from 'vitest';
import { calendarSetup_create } from '#tests/support/calendar.setup';
import { fixtures_resource } from '#tests/support/calendar.fixtures';

it('places parents before descendants while retaining root and sibling input order', async () => {
  const resources = [
    { ...fixtures_resource('child-b'), parentId: 'parent' },
    fixtures_resource('other'),
    { ...fixtures_resource('grandchild'), parentId: 'child-b' },
    fixtures_resource('parent'),
    { ...fixtures_resource('child-a'), parentId: 'parent' },
  ];
  const { state } = await calendarSetup_create({ view: 'resources', resources });
  const layout = state().layout;
  if (layout.kind !== 'timeGrid') throw new Error('expected timeGrid');
  expect(layout.columns.map(column => column.resource?.id)).toEqual(['other', 'parent', 'child-b', 'grandchild', 'child-a']);
  expect(layout.columns[2]!.resource).toBe(resources[0]);
  expect(resources.map(resource => resource.id)).toEqual(['child-b', 'other', 'grandchild', 'parent', 'child-a']);
});

it.each([
  { name: 'duplicate IDs', resources: [fixtures_resource('a'), fixtures_resource('a')], reason: /duplicate resource id/ },
  { name: 'missing parents', resources: [{ ...fixtures_resource('a'), parentId: 'missing' }], reason: /missing parent/ },
  { name: 'self-parenting', resources: [{ ...fixtures_resource('a'), parentId: 'a' }], reason: /resource cycle/ },
  {
    name: 'cycles',
    resources: [
      { ...fixtures_resource('a'), parentId: 'b' },
      { ...fixtures_resource('b'), parentId: 'a' },
    ],
    reason: /resource cycle/,
  },
])('rejects $name before layout', async ({ resources, reason }) => {
  await expect(calendarSetup_create({ resources })).rejects.toThrow(reason);
});
