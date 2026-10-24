import { dayGridView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { scenario, dense, spanning, resources } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Overflow' };
export const LocalOverflow = story(scenario({ events: dense }), {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '4 more' })).toBeVisible();
  },
});
export const SpanningEventOverflow = story(scenario({ events: [...spanning, ...dense] }));
export const ResourceScopedOverflow = story(
  scenario({ resources, events: dense, view: dayGridView({ days: 1, groupBy: 'resource', maxEventsPerDay: 2 }) }),
);
export const ServerOverflowHint = story(
  scenario({
    events: [],
    view: dayGridView({ period: 'month', maxEventsPerDay: 3, dayOverflow: date => date.toString() === '2026-03-11' }),
  }),
  {
    play: async ({ canvas }) => {
      await expect(canvas.getByRole('button', { name: 'More events' })).toBeVisible();
    },
  },
);
export const OpenOverflowDetails = story(scenario({ events: dense }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '4 more' }));
    await expect(canvas.getByRole('region', { name: 'Bookings on 2026-03-11' })).toBeVisible();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(7);
  },
});
