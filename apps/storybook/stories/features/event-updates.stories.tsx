import { listView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { scenario } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Event updates' };
const config = scenario({ view: listView({ weeks: 1 }), eventControls: true });
export const AddEvent = story(config, {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add booking' }));
    await expect(canvas.getByRole('button', { name: 'Added booking' })).toBeVisible();
  },
});
export const UpdateEvent = story(config, {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Update first booking' }));
    await expect(canvas.getByRole('button', { name: 'Updated booking' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Planning' })).not.toBeInTheDocument();
  },
});
export const RemoveEvent = story(config, {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove first booking' }));
    await expect(canvas.queryByRole('button', { name: 'Planning' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Review' })).toBeVisible();
  },
});
export const ResetEvents = story(config, {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Reset bookings' }));
    await expect(canvas.getByText('No bookings in this range')).toBeVisible();
  },
});
export const FilterEvents = story(config, {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle filter' }));
    await expect(canvas.getByText('No bookings in this range')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle filter' }));
    await expect(canvas.getByRole('button', { name: 'Planning' })).toBeVisible();
  },
});
export const CustomOrdering = story(
  scenario({ ...config, eventOrder: (a, b) => b.data.title.localeCompare(a.data.title, 'en-US') }),
  {
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector('[data-part="list-event"]')).toHaveTextContent('Support');
    },
  },
);
