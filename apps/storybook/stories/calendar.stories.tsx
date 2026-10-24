import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import type { ScreenshotParameters } from '../.storybook/screenshot';
import { CalendarStory } from './calendar';

const meta = {
  title: 'Calendar/Views',
  component: CalendarStory,
  render: args => <CalendarStory key={args.view} {...args} />,
  parameters: { screenshot: true } satisfies ScreenshotParameters,
  args: { view: 'month', empty: false, colorScheme: 'light' },
} satisfies Meta<typeof CalendarStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};
export const Week: Story = { args: { view: 'week' } };
export const Agenda: Story = { args: { view: 'agenda' } };
export const Timeline: Story = { args: { view: 'timeline' } };
export const EmptyAgenda: Story = { args: { view: 'agenda', empty: true } };
export const DarkMonth: Story = { args: { colorScheme: 'dark' } };

export const MobileMonth: Story = {
  parameters: {
    screenshot: {
      viewport: { width: 390, height: 844 },
      selector: '[data-scope="calendar"][data-part="day-grid-root"]',
      options: { comparatorOptions: { allowedMismatchedPixels: 0 } },
    },
  } satisfies ScreenshotParameters,
};

export const NavigateToDay: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Go to Wednesday, March 11, 2026' }));
    await expect(canvas.getByText('Standup')).toBeVisible();
  },
};
