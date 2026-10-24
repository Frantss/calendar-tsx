import { dayGridView, timeGridView, timelineView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { scenario, resources, bookings, allDay, dayWindow, at } from '../support/fixtures';
import { ScenarioCalendar, scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Resources' };
const resourceDay = timeGridView({ days: 1, groupBy: 'resource', timeWindow: dayWindow });
export const SharedEvent = story(scenario({ resources, events: [bookings[1]!], view: resourceDay }), {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Review')).toHaveLength(2);
  },
});
export const UnassignedEvent = story(
  scenario({ resources, events: [...bookings, allDay('Unassigned', '2026-03-11')], view: resourceDay }),
  {
    play: async ({ canvas }) => {
      await expect(canvas.queryByText('Unassigned')).not.toBeInTheDocument();
    },
  },
);
export const ResourceOrder = story(scenario({ resources: [...resources].reverse(), view: resourceDay }), {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-part="time-grid-column-header"]')).toHaveTextContent('Room B');
  },
});
export const ResourceFirstColumns = story(
  scenario({
    resources,
    view: timeGridView({ days: 2, groupBy: 'resource', groupOrder: 'resource-first', timeWindow: dayWindow }),
  }),
);
export const DateFirstColumns = story(
  scenario({
    resources,
    view: timeGridView({ days: 2, groupBy: 'resource', groupOrder: 'date-first', timeWindow: dayWindow }),
  }),
);
export const MonthsThenResources = story(
  scenario({ resources, view: dayGridView({ months: 2, groupBy: ['month', 'resource'], maxEventsPerDay: 3 }) }),
  {
    render: args => (
      <div className='story-resource-months'>
        <ScenarioCalendar {...args} />
      </div>
    ),
  },
);
export const ResourcesThenMonths = story(
  scenario({ resources, view: dayGridView({ months: 2, groupBy: ['resource', 'month'], maxEventsPerDay: 3 }) }),
);
export const BusinessHours = story(scenario({ resources, view: resourceDay }));
export const SplitAvailability = story(
  scenario({
    view: resourceDay,
    resources: resources.map(resource => ({
      ...resource,
      availability: [
        { start: at('2026-03-11T09:00'), end: at('2026-03-11T12:00') },
        { start: at('2026-03-11T14:00'), end: at('2026-03-11T17:00') },
      ],
    })),
  }),
);
export const FullyUnavailable = story(
  scenario({ resources: resources.map(resource => ({ ...resource, availability: [] })), view: resourceDay }),
  {
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelectorAll('[data-part="time-grid-column"][data-unavailable]')).toHaveLength(2);
    },
  },
);
export const ResourceSpecificHours = story(
  scenario({
    resources,
    view: timelineView({ days: 1, groupBy: 'resource', timeWindow: dayWindow, minSlotWidth: '4rem' }),
  }),
);
