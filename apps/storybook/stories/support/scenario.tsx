import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarProvider, useCalendar, useCalendarEventStore, useCalendarSelector } from '@calendar-tsx/react';
import type { Calendar_StateOf } from '@calendar-tsx/core';
import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { CalendarLayout } from './layout';
import { at, timed, manuallyAdvancedClock } from './fixtures';
import type { Scenario } from './fixtures';
import './stories.css';

const Observed = ({
  calendar,
  scenario: config,
}: {
  calendar: ReturnType<
    typeof useCalendar<
      import('./fixtures').EventData,
      import('./fixtures').ResourceData,
      Scenario['views'],
      Scenario['features']
    >
  >;
  scenario: Scenario;
}) => {
  const state = useCalendarSelector((value: Calendar_StateOf<typeof calendar>) => value);
  const [selection, setSelection] = useState('');
  const [overflow, setOverflow] = useState<{ date: string; events: string[] } | null>(null);
  return (
    <>
      {config.controls && (
        <>
          <nav aria-label='Calendar navigation' className='story-controls'>
            <button onClick={() => calendar.api.prev()}>Previous</button>
            <button onClick={() => calendar.api.today()}>Today</button>
            <button onClick={() => calendar.api.next()}>Next</button>
            <button onClick={() => calendar.api.goTo(Temporal.PlainDate.from('2026-04-15'))}>Go to April 15</button>
            <button onClick={() => calendar.api.setView('month')}>Month view</button>
            <button onClick={() => calendar.api.setView('week')}>Week view</button>
            <button onClick={() => calendar.api.setView('day')}>Day view</button>
          </nav>
          <output aria-label='Visible date'>{state.context.date.toString()}</output>{' '}
          <output aria-label='Active view'>{state.context.view}</output>{' '}
          <output aria-label='Input range'>
            {state.context.inputRange.start.toString()} – {state.context.inputRange.end.toString()}
          </output>
        </>
      )}
      <CalendarLayout
        calendar={calendar}
        layout={state.layout}
        locale={config.locale}
        onSelect={setSelection}
        onOverflow={(date, events) => setOverflow({ date, events })}
        preventDayNavigation={config.preventDayNavigation}
        eventContent={config.eventContent}
        accessibleLabel={config.accessibleLabel}
      />
      {selection && <output aria-label='Selected booking'>{selection}</output>}
      {config.clockControls && <output aria-label='Clock time'>{state.now.toString()}</output>}
      {overflow && (
        <section aria-label={`Bookings on ${overflow.date}`} className='story-details'>
          <h2>Bookings on {overflow.date}</h2>
          {overflow.events.length ? (
            <ul>
              {overflow.events.map(title => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          ) : (
            <p>Additional bookings are available from the event source.</p>
          )}
          <button onClick={() => setOverflow(null)}>Close details</button>
        </section>
      )}
    </>
  );
};

export const ScenarioCalendar = ({ scenario: config }: { scenario: Scenario }) => {
  const [navigation, setNavigation] = useState<{ view: keyof Scenario['views']; date: Temporal.PlainDate }>({
    view: 'example',
    date: Temporal.PlainDate.from(config.date ?? '2026-03-11'),
  });
  const [pending, setPending] = useState<typeof navigation | null>(null);
  const [filter, setFilter] = useState(false);
  const [manualClock] = useState(() => manuallyAdvancedClock(config.clockStart ?? '2026-03-11T14:40:00Z'));
  const eventStore = useCalendarEventStore(config.events);
  const calendar = useCalendar({
    ...navigation,
    views: config.views,
    features: config.features,
    events: filter ? [] : eventStore.events,
    resources: config.resources ?? [],
    timeZone: config.timeZone ?? 'America/New_York',
    firstDayOfWeek: config.firstDayOfWeek ?? 7,
    clock: config.clockControls ? manualClock.clock : config.clock,
    eventOrder: config.eventOrder,
    onNavigate: next => {
      const value = { view: next.view, date: next.date };
      if (config.controlledNavigation) setPending(value);
      else setNavigation(value);
    },
  });
  return (
    <div
      className='story-surface'
      style={{
        maxWidth: 1100,
        colorScheme: config.colorScheme ?? 'light',
        background: 'Canvas',
        color: 'CanvasText',
        ...config.style,
      }}
    >
      {config.caption && <p>{config.caption}</p>}
      {config.clockControls && (
        <div className='story-controls'>
          <button onClick={() => manualClock.advance(config.clockNext ?? '2026-03-11T15:40:00Z')}>Advance clock</button>
        </div>
      )}
      {config.eventControls && (
        <div className='story-controls'>
          <button onClick={() => eventStore.add([timed('Added booking', '2026-03-11T15:00', '2026-03-11T16:00')])}>
            Add booking
          </button>
          <button
            onClick={() =>
              eventStore.update(config.events[0]!.id, event => ({
                ...event,
                data: { ...event.data, title: 'Updated booking' },
              }))
            }
          >
            Update first booking
          </button>
          <button onClick={() => eventStore.remove(config.events[0]!.id)}>Remove first booking</button>
          <button onClick={() => eventStore.reset([])}>Reset bookings</button>
          <button onClick={() => setFilter(value => !value)}>Toggle filter</button>
          <button
            onClick={() =>
              eventStore.reset(
                config.events.map(event => ({ ...event, data: { ...event.data, title: 'Edited series' } })),
              )
            }
          >
            Edit series
          </button>
          <button
            onClick={() => {
              eventStore.reset(
                config.events.map(event =>
                  'rrule' in event && event.kind === 'timed' ? { ...event, exdate: [at('2026-03-11T09:00')] } : event,
                ),
              );
              eventStore.add([timed('Replacement booking', '2026-03-11T11:00', '2026-03-11T12:00')]);
            }}
          >
            Replace occurrence
          </button>
        </div>
      )}
      {config.controlledNavigation && (
        <div className='story-controls'>
          <button
            disabled={!pending}
            onClick={() => {
              if (pending) setNavigation(pending);
              setPending(null);
            }}
          >
            Apply navigation
          </button>
        </div>
      )}
      <CalendarProvider value={calendar} locale={config.locale ?? 'en-US'}>
        <Observed calendar={calendar} scenario={config} />
      </CalendarProvider>
    </div>
  );
};

export const scenarioAnnotations = {
  component: ScenarioCalendar,
  parameters: { screenshot: true },
  render: args => <ScenarioCalendar key={`${args.scenario.date}-${args.scenario.views.example.kind}`} {...args} />,
} satisfies Meta<typeof ScenarioCalendar>;
export type ScenarioStory = StoryObj<typeof ScenarioCalendar>;
export const story = (config: Scenario, extra: Omit<ScenarioStory, 'args'> = {}): ScenarioStory => ({
  args: { scenario: config },
  ...extra,
});
