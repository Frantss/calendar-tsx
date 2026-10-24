import { timeGridView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { scenario, overnightWindow } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Navigation' };
export const PreviousNext = story(scenario({ controls: true }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Next$/ }));
    await expect(canvas.getByLabelText('Visible date')).toHaveTextContent('2026-04-01');
    await userEvent.click(canvas.getByRole('button', { name: /^Previous$/ }));
    await expect(canvas.getByLabelText('Visible date')).toHaveTextContent('2026-03-01');
  },
});
export const Today = story(scenario({ controls: true, date: '2026-01-01' }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Today$/ }));
    await expect(canvas.getByLabelText('Visible date')).toHaveTextContent('2026-03-11');
  },
});
export const GoToDate = story(scenario({ controls: true }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Go to April 15' }));
    await expect(canvas.getByLabelText('Visible date')).toHaveTextContent('2026-04-15');
  },
});
export const SwitchView = story(scenario({ controls: true }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Week view' }));
    await expect(canvas.getByLabelText('Active view')).toHaveTextContent('week');
    await expect(canvas.getByRole('region', { name: 'Time grid' })).toBeVisible();
  },
});
export const ControlledNavigation = story(scenario({ controls: true, controlledNavigation: true }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Next$/ }));
    await expect(canvas.getByLabelText('Visible date')).toHaveTextContent('2026-03-11');
    await userEvent.click(canvas.getByRole('button', { name: 'Apply navigation' }));
    await expect(canvas.getByLabelText('Visible date')).toHaveTextContent('2026-04-01');
  },
});
export const DayTrigger = story(scenario({ controls: true }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Go to Wednesday, March 11, 2026' }));
    await expect(canvas.getByLabelText('Active view')).toHaveTextContent('day');
  },
});
export const PreventedDayTrigger = story(scenario({ controls: true, preventDayNavigation: true }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Go to Wednesday, March 11, 2026' }));
    await expect(canvas.getByLabelText('Active view')).toHaveTextContent('example');
    await expect(canvas.getByRole('region', { name: 'Calendar' })).toBeVisible();
  },
});
export const OvernightInputRange = story(
  scenario({ controls: true, view: timeGridView({ days: 1, timeWindow: overnightWindow }) }),
  {
    play: async ({ canvas }) => {
      await expect(canvas.getByLabelText('Input range')).toHaveTextContent('2026-03-11 – 2026-03-12');
    },
  },
);
