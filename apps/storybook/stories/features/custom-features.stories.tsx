import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { useState } from 'react';
import { createStore } from '@tanstack/store';
import { backgroundFeature, calendarFeatures, calendarViews, fixedClock, timeGridView } from '@calendar-tsx/core';
import type { Calendar_StateOf } from '@calendar-tsx/core';
import { CalendarProvider, useCalendar, useCalendarSelector } from '@calendar-tsx/react';
import { Temporal } from 'temporal-polyfill';
import { highlightFeature } from '../../../docs/examples/features/highlight-feature';
import { bookings, dayWindow, resources } from '../support/fixtures';
import { CalendarLayout } from '../support/layout';

const baseFeatures = calendarFeatures({ background: backgroundFeature(), highlight: highlightFeature() });
const baseViews = calendarViews({
  features: baseFeatures,
  views: {
    day: timeGridView({ days: 1, timeWindow: dayWindow }),
    week: timeGridView({ weeks: 1, timeWindow: dayWindow }),
  },
});
const overrideViews = calendarViews({
  features: baseFeatures,
  views: {
    day: timeGridView({ days: 1, timeWindow: dayWindow, features: { highlight: { only: true } } }),
    week: timeGridView({ weeks: 1, timeWindow: dayWindow }),
  },
});
const clock = fixedClock(Temporal.Instant.from('2026-03-11T14:40Z'));
type Instance = ReturnType<
  typeof useCalendar<
    import('../support/fixtures').EventData,
    import('../support/fixtures').ResourceData,
    typeof baseViews,
    typeof baseFeatures
  >
>;
const FeatureState = ({ calendar, atom }: { calendar: Instance; atom?: { readonly state: string | null } }) => {
  const state = useCalendarSelector((value: Calendar_StateOf<Instance>) => value);
  return (
    <>
      <div className='story-status'>
        <output aria-label='Highlighted event'>Highlight: {state.highlighted ?? 'None'}</output>
        {atom && <output aria-label='External atom'>External atom: {atom.state ?? 'None'}</output>}
      </div>
      <CalendarLayout calendar={calendar} layout={state.layout} />
    </>
  );
};
const FeatureCalendar = ({
  mode = 'internal',
  override = false,
}: {
  mode?: 'internal' | 'controlled' | 'external';
  override?: boolean;
}) => {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [atom] = useState(() => createStore<string | null>(null));
  const [view, setView] = useState<'day' | 'week'>('day');
  const calendar = useCalendar({
    views: override ? overrideViews : baseViews,
    features: baseFeatures,
    events: bookings,
    resources,
    date: Temporal.PlainDate.from('2026-03-11'),
    view,
    timeZone: 'America/New_York',
    clock,
    state: mode === 'controlled' ? { highlighted } : undefined,
    atoms: mode === 'external' ? { highlighted: atom } : undefined,
    onNavigate: next => setView(next.view),
  });
  return (
    <div className='story-surface'>
      <div className='story-controls'>
        <button
          onClick={() => (mode === 'controlled' ? setHighlighted('Planning') : calendar.api.highlight('Planning'))}
        >
          Highlight planning
        </button>
        <button onClick={() => (mode === 'controlled' ? setHighlighted(null) : calendar.api.highlight(null))}>
          Clear highlight
        </button>
        {mode === 'controlled' && (
          <button onClick={() => calendar.api.highlight('Review')}>Request internal highlight</button>
        )}
        <button onClick={() => setView(value => (value === 'day' ? 'week' : 'day'))}>Switch view</button>
      </div>
      <CalendarProvider value={calendar}>
        <FeatureState calendar={calendar} atom={mode === 'external' ? atom : undefined} />
      </CalendarProvider>
    </div>
  );
};
const Example = ({
  mode = 'internal',
  override = false,
  independent = false,
}: {
  mode?: 'internal' | 'controlled' | 'external';
  override?: boolean;
  independent?: boolean;
}) => (
  <>
    <section aria-label='First calendar'>
      <FeatureCalendar mode={mode} override={override} />
    </section>
    {independent && (
      <section aria-label='Second calendar'>
        <FeatureCalendar />
      </section>
    )}
  </>
);
const meta = { title: 'Features/Custom features', component: Example, parameters: { screenshot: true } } satisfies Meta<
  typeof Example
>;
export default meta;
type Story = StoryObj<typeof meta>;
const highlight: Story['play'] = async ({ canvas, canvasElement, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Highlight planning' }));
  await expect(canvas.getByLabelText('Highlighted event')).toHaveTextContent('Planning');
  await expect(canvasElement.querySelector('[data-highlighted]')).toHaveTextContent('Planning');
};
export const HighlightFeature: Story = { play: highlight };
export const PerViewConfiguration: Story = {
  args: { override: true },
  play: async context => {
    await highlight(context);
    await expect(context.canvas.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
  },
};
export const InternalState: Story = { play: highlight };
export const ControlledState: Story = {
  args: { mode: 'controlled' },
  play: async context => {
    await highlight(context);
    await context.userEvent.click(context.canvas.getByRole('button', { name: 'Request internal highlight' }));
    await expect(context.canvas.getByLabelText('Highlighted event')).toHaveTextContent('Planning');
  },
};
export const ExternalAtom: Story = {
  args: { mode: 'external' },
  play: async context => {
    await highlight(context);
    await expect(context.canvas.getByLabelText('External atom')).toHaveTextContent('Planning');
  },
};
export const StatePersistsAcrossViews: Story = {
  play: async context => {
    await highlight(context);
    await context.userEvent.click(context.canvas.getByRole('button', { name: 'Switch view' }));
    await expect(context.canvas.getByLabelText('Highlighted event')).toHaveTextContent('Planning');
  },
};
export const IndependentInstances: Story = {
  args: { independent: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole('button', { name: 'Highlight planning' })[0]!);
    const values = canvas.getAllByLabelText('Highlighted event');
    await expect(values[0]).toHaveTextContent('Planning');
    await expect(values[1]).toHaveTextContent('None');
  },
};
