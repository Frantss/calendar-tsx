import { fixedClock, timeGridView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { Temporal } from 'temporal-polyfill';
import { scenario, dayWindow } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Clock' };
export const TodayHighlight = story(scenario(), {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-part="day-grid-day"][data-today]')).toHaveAttribute(
      'data-date',
      '2026-03-11',
    );
  },
});
export const NowIndicator = story(
  scenario({ view: timeGridView({ days: 1, timeWindow: dayWindow }), clockControls: true }),
  {
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Advance clock' }));
      await expect(canvas.getByLabelText('Clock time')).toHaveTextContent('11:40');
    },
  },
);
export const NowOutsideWindow = story(
  scenario({
    view: timeGridView({ days: 1, timeWindow: dayWindow }),
    clock: fixedClock(Temporal.Instant.from('2026-03-11T23:00Z')),
  }),
  {
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector('[data-part="time-grid-now"]')).not.toBeInTheDocument();
    },
  },
);
export const NowOnHiddenDay = story(
  scenario({ view: timeGridView({ weeks: 1, hiddenDays: [3], timeWindow: dayWindow }) }),
  {
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector('[data-part="time-grid-now"]')).not.toBeInTheDocument();
    },
  },
);
export const MidnightRollover = story(
  scenario({ clockControls: true, clockStart: '2026-03-12T03:55Z', clockNext: '2026-03-12T04:05Z' }),
  {
    play: async ({ canvas, canvasElement, userEvent }) => {
      await expect(canvasElement.querySelector('[data-part="day-grid-day"][data-today]')).toHaveAttribute(
        'data-date',
        '2026-03-11',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Advance clock' }));
      await expect(canvasElement.querySelector('[data-part="day-grid-day"][data-today]')).toHaveAttribute(
        'data-date',
        '2026-03-12',
      );
    },
  },
);
