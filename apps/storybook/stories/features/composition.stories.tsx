import { timeGridView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { scenario, dayWindow } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Composition and accessibility' };
const day = timeGridView({ days: 1, timeWindow: dayWindow });
export const CustomEventContent = story(scenario({ view: day, eventContent: 'custom' }));
export const RenderElement = story(scenario({ view: day, eventContent: 'element' }), {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvasElement.querySelector('[data-custom-event="element"]')).toHaveAttribute(
      'data-part',
      'time-grid-event',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Planning' }));
    await expect(canvas.getByLabelText('Selected booking')).toHaveTextContent('Planning');
  },
});
export const RenderFunction = story(scenario({ view: day, eventContent: 'function' }), {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-custom-event="function"]')).toHaveAttribute(
      'data-event-id',
      'Planning',
    );
  },
});
export const KeyboardActivation = story(scenario({ view: day }), {
  play: async ({ canvas, userEvent }) => {
    canvas.getByRole('button', { name: 'Planning' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByLabelText('Selected booking')).toHaveTextContent('Planning');
  },
});
export const FocusVisible = story(scenario({ view: day }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Go to Wednesday, March 11, 2026' })).toHaveFocus();
  },
});
export const LocalizedDateLabels = story(scenario({ view: day, locale: 'es-UY' }), {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /Go to miércoles/ })).toBeVisible();
  },
});
export const CustomAccessibleLabels = story(scenario({ view: day, accessibleLabel: 'Room booking schedule' }), {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('region', { name: 'Room booking schedule' })).toBeVisible();
  },
});
