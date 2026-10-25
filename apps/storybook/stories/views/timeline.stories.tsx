import { timelineView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { scenario, resources, overlaps, brief, spanning, dayWindow } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Views/Timeline' };
const day = timelineView({ days: 1, timeWindow: dayWindow, minSlotWidth: '4rem' });
export const SingleRow = story(scenario({ view: day }));
export const ResourceRows = story(
  scenario({ view: timelineView({ days: 1, timeWindow: dayWindow, groupBy: 'resource' }), resources }),
);
export const DaySchedule = story(
  scenario({ view: timelineView({ days: 1, timeWindow: dayWindow, slotMinutes: 30, minSlotWidth: '3rem' }) }),
);
const nestedResources = [
  { ...resources[0]!, id: 'building', title: 'Building' },
  { ...resources[0]!, id: 'floor', title: 'Floor 1', parentId: 'building' },
  { ...resources[0]!, parentId: 'floor' },
  { ...resources[1]!, parentId: 'building' },
];
export const NestedRows = story(
  scenario({ view: timelineView({ days: 1, timeWindow: dayWindow, groupBy: 'resource' }), resources: nestedResources }),
  {
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Collapse Floor 1' }));
      await expect(canvas.queryByText('Room A', { exact: true })).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: 'Collapse Building' }));
      await expect(canvas.queryByText('Room B', { exact: true })).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: 'Expand Building' }));
      await expect(canvas.getByText('Room B', { exact: true })).toBeVisible();
      await expect(canvas.queryByText('Room A', { exact: true })).not.toBeInTheDocument();
    },
  },
);
export const InitiallyCollapsed = story(
  scenario({
    view: timelineView({
      days: 1,
      timeWindow: dayWindow,
      groupBy: 'resource',
      features: { tree: { initiallyExpanded: false } },
    }),
    resources: nestedResources,
  }),
);
export const MonthWithDailySlots = story(
  scenario({ events: spanning, view: timelineView({ period: 'month', slotMinutes: 1440, minSlotWidth: '3rem' }) }),
);
export const Quarter = story(
  scenario({ events: spanning, view: timelineView({ period: 'quarter', slotMinutes: 1440, minSlotWidth: '5rem' }) }),
);
export const StackedEvents = story(scenario({ events: overlaps, view: day }));
export const ShortEvents = story(scenario({ events: brief, view: day }));
export const ClippedBars = story(scenario({ events: spanning, view: timelineView({ weeks: 1, slotMinutes: 1440 }) }));
export const HorizontalScroll = story(
  scenario({ view: timelineView({ weeks: 1, slotMinutes: 60, minSlotWidth: '4rem', groupBy: 'resource' }), resources }),
  { parameters: { screenshot: { viewport: { width: 600, height: 720 } } } },
);
