import { StrictMode, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarProvider,
  useCalendar,
  useCalendarSelector,
  TimeGridView,
  TimeGridViewAllDay,
  TimeGridViewAllDayEvent,
  TimeGridViewAxis,
  TimeGridViewAxisLabel,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimelineView,
  TimelineViewBody,
  TimelineViewHeader,
  TimelineViewDayHeader,
  TimelineViewSlotLabel,
  TimelineViewRow,
  TimelineViewResource,
  TimelineViewLane,
  TimelineViewEvent,
} from '@calendar-tsx/react';
import type {
  Calendar_EventInput,
  Calendar_TimeGridLayout,
  Calendar_TimelineLayout,
  Calendar_StateOf,
} from '@calendar-tsx/core';
import {
  createSetup,
  optionsFor,
  presets,
  type Data,
  type Instance,
  type Preset,
  type Mode,
  type View,
} from '../../../core/prototypes/interaction-foundation/bindings/setup';
import {
  createHost,
  expose,
  rangeLabel,
  type Host,
  type HostState,
} from '../../../core/prototypes/interaction-foundation/bindings/host';
import { surfaceKey, type Surface } from '../../../core/prototypes/interaction-foundation/bindings/geometry';
import {
  idle,
  isDateTarget,
  type Ownership,
  type Selection,
} from '../../../core/prototypes/interaction-foundation/operations';
import '../../../core/prototypes/interaction-foundation/bindings/style.css';

const Preview = ({ state, surface, vertical = false }: { state: HostState; surface: Surface; vertical?: boolean }) => (
  <>
    {state.previews
      .filter(preview => preview.surface === surfaceKey(surface))
      .map((preview, index) => (
        <div
          className='preview'
          data-preview={preview.surface}
          key={index}
          style={
            vertical
              ? { top: `${preview.start * 100}%`, height: `${preview.span * 100}%` }
              : { left: `${preview.start * 100}%`, width: `${preview.span * 100}%` }
          }
        >
          Preview
        </div>
      ))}
  </>
);

const Grid = ({ model, host, state }: { model: Calendar_TimeGridLayout<Data, null>; host: Host; state: HostState }) => (
  <TimeGridView model={model}>
    <TimeGridViewHeader>
      {model.columns.map(column => (
        <TimeGridViewColumnHeader key={column.key} column={column}>
          {column.date.toString()} · {column.resource?.title}
        </TimeGridViewColumnHeader>
      ))}
    </TimeGridViewHeader>
    <TimeGridViewAllDay ref={host.ref({ kind: 'allDay' })}>
      {model.allDay?.segments.map(segment => (
        <TimeGridViewAllDayEvent key={segment.key} segment={segment} data-event-id={segment.event.id}>
          {segment.event.data.title}
          {!segment.continuesBefore && (
            <span className='resize-handle start' data-resize-edge='start' aria-hidden='true' />
          )}
          {!segment.continuesAfter && <span className='resize-handle end' data-resize-edge='end' aria-hidden='true' />}
        </TimeGridViewAllDayEvent>
      ))}
      <div className='all-day-previews'>
        <Preview state={state} surface={{ kind: 'allDay' }} />
      </div>
    </TimeGridViewAllDay>
    <TimeGridViewBody model={model}>
      <TimeGridViewAxis>
        {model.slots.map(slot => (
          <TimeGridViewAxisLabel key={slot.key} slot={slot}>
            {slot.time.minute === 0 ? slot.time.toString({ smallestUnit: 'minute' }) : ''}
          </TimeGridViewAxisLabel>
        ))}
      </TimeGridViewAxis>
      {model.columns.map(column => (
        <TimeGridViewColumn key={column.key} column={column} ref={host.ref({ kind: 'column', key: column.key })}>
          {column.segments.map(segment => (
            <TimeGridViewEvent key={segment.key} segment={segment} data-event-id={segment.event.id}>
              {segment.event.data.title}
              {!segment.continuesBefore && (
                <span className='resize-handle start' data-resize-edge='start' aria-hidden='true' />
              )}
              {!segment.continuesAfter && (
                <span className='resize-handle end' data-resize-edge='end' aria-hidden='true' />
              )}
            </TimeGridViewEvent>
          ))}
          <Preview state={state} surface={{ kind: 'column', key: column.key }} vertical />
        </TimeGridViewColumn>
      ))}
    </TimeGridViewBody>
  </TimeGridView>
);
const Timeline = ({
  model,
  host,
  state,
}: {
  model: Calendar_TimelineLayout<Data, null>;
  host: Host;
  state: HostState;
}) => (
  <TimelineView model={model}>
    <TimelineViewHeader>
      {model.days.map(day => (
        <TimelineViewDayHeader key={day.key} day={day}>
          {day.date.toString()}
        </TimelineViewDayHeader>
      ))}
      {model.slots.map(slot => (
        <TimelineViewSlotLabel key={slot.key} slot={slot}>
          {slot.time.minute === 0 && slot.time.hour % 6 === 0 ? slot.time.toString({ smallestUnit: 'minute' }) : ''}
        </TimelineViewSlotLabel>
      ))}
    </TimelineViewHeader>
    <TimelineViewBody>
      {model.rows.map(row => (
        <TimelineViewRow key={row.key} row={row}>
          <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
          <TimelineViewLane row={row} ref={host.ref({ kind: 'lane', key: row.key })}>
            {row.segments.map(segment => (
              <TimelineViewEvent key={segment.key} segment={segment} data-event-id={segment.event.id}>
                {segment.event.data.title}
                {!segment.continuesBefore && (
                  <span className='resize-handle start' data-resize-edge='start' aria-hidden='true' />
                )}
                {!segment.continuesAfter && (
                  <span className='resize-handle end' data-resize-edge='end' aria-hidden='true' />
                )}
              </TimelineViewEvent>
            ))}
            <Preview state={state} surface={{ kind: 'lane', key: row.key }} />
          </TimelineViewLane>
        </TimelineViewRow>
      ))}
    </TimelineViewBody>
  </TimelineView>
);
const Layout = ({ calendar, host, state }: { calendar: Instance; host: Host; state: HostState }) => {
  const model = useCalendarSelector((value: Calendar_StateOf<typeof calendar>) => value.layout);
  return model.kind === 'timeGrid' ? (
    <Grid model={model} host={host} state={state} />
  ) : model.kind === 'timeline' ? (
    <Timeline model={model} host={host} state={state} />
  ) : (
    <p>Display-only list. Interaction features are inactive.</p>
  );
};
const Harness = ({ preset, owner, mode }: { preset: Preset; owner: Ownership['mode']; mode: Mode }) => {
  const [setup] = useState(() => createSetup(preset, mode));
  const [view, setView] = useState<View>('grid');
  const [date, setDate] = useState(setup.date);
  const [events, setEvents] = useState(setup.events);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [controlled, setControlled] = useState(idle);
  const [accepted] = useState(() => {
    let current = idle();
    return {
      read: () => current,
      accept: (next: ReturnType<typeof idle>) => {
        current = next;
      },
    };
  });
  const calendar = useCalendar({
    ...optionsFor(setup, view, events, selection, next => {
      setView(next.view);
      setDate(next.date);
    }),
    date,
  });
  const [host] = useState(() =>
    createHost(
      calendar,
      setup,
      owner === 'controlled'
        ? { mode: owner, read: accepted.read, onChange: setControlled }
        : owner === 'external'
          ? { mode: owner, atom: setup.atom }
          : { mode: owner },
      proposal => {
        if (proposal.kind === 'select') setSelection(proposal.range);
      },
    ),
  );
  useLayoutEffect(() => {
    expose(host);
    return host.connect();
  }, [host]);
  useLayoutEffect(() => {
    accepted.accept(controlled);
    host.refresh();
  }, [host, controlled, accepted]);
  const state = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getSnapshot);
  const root = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState(true);
  useLayoutEffect(() => {
    if (pointer && view !== 'list' && root.current) return host.attach(root.current);
  }, [host, pointer, view]);
  const fields = {
    Features: state.features.join(', '),
    Session: state.draft.session ? `${state.draft.session.intent.kind} / ${state.draft.session.token}` : 'Idle',
    Target: isDateTarget(state.draft.session?.target) ? state.draft.session.target.at.toString() : 'None',
    Candidate: state.draft.candidate
      ? state.draft.candidate.status === 'valid'
        ? state.draft.candidate.proposal.kind
        : `${state.draft.candidate.status}: ${state.draft.candidate.reason}`
      : 'None',
    Outcome: state.draft.outcome ?? 'None',
    'Last edit': state.lastMove
      ? `${state.lastMove!.before.id}: ${state.lastMove!.after.start.toString()} → ${state.lastMove!.after.end?.toString() ?? state.lastMove!.after.start.toString()}`
      : 'None',
    Selection: rangeLabel(state.selectedRange),
    Previews:
      state.previews
        .map(preview => `${preview.surface}: ${preview.start.toFixed(6)} / ${preview.span.toFixed(6)}`)
        .join('; ') || 'None',
    'Base builds / notifications': `${state.counts.baseBuilds} / ${state.counts.baseNotifications}`,
    'Last draft base builds': String(state.counts.lastDraftBuilds),
    'Preview builds / emissions': `${state.counts.previewBuilds} / ${state.counts.emissions}`,
    'Listeners / surfaces / connections': `${state.counts.listeners} / ${state.counts.surfaces} / ${state.counts.connections}`,
  };
  return (
    <>
      <div className='controls'>
        <label>
          View{' '}
          <select value={view} onChange={event => calendar.api.setView(event.target.value as View)}>
            <option value='grid'>Time grid</option>
            <option value='timeline'>Timeline</option>
            <option value='list'>Display-only list</option>
          </select>
        </label>
        <label>
          <input type='checkbox' checked={pointer} onChange={event => setPointer(event.target.checked)} /> Pointer input
        </label>
        <button onClick={() => calendar.api.next()}>Next period</button>
        <span>
          {date.toString()} · {setup.timeZone}
        </span>
      </div>
      <div className='controls'>
        <button onClick={() => host.command('select')}>Preview selection 14–15</button>
        <button onClick={() => host.command('move')}>Preview move to Room B 14:00</button>
        <button onClick={() => host.command('allDay')}>Preview two-day selection</button>
        <button onClick={() => host.command('resize-start')}>Preview Resizable start at 13:30</button>
        <button onClick={() => host.command('resize-end')}>Preview Resizable end at 16:00</button>
        <button onClick={() => host.command('complete')}>Complete</button>
        <button onClick={() => host.command('cancel')}>Cancel</button>
        <button
          onClick={() => {
            const proposal = host.apply();
            if (proposal)
              setEvents(previous =>
                previous.map(event =>
                  event.id === proposal.before.id ? (proposal.after as Calendar_EventInput<Data>) : event,
                ),
              );
          }}
        >
          Apply edit
        </button>
        <button
          onClick={() =>
            setEvents(previous =>
              previous.map(event =>
                event.id === 'Appointment' ? { ...event, data: { title: 'Changed source' } } : event,
              ),
            )
          }
        >
          Replace source
        </button>
      </div>
      <div className='workspace'>
        <div className='canvas' ref={root}>
          <CalendarProvider value={calendar}>
            <Layout calendar={calendar} host={host} state={state} />
          </CalendarProvider>
        </div>
        <aside className='inspector'>
          <h2>Runtime state</h2>
          <output>{state.message}</output>
          <dl>
            {Object.entries(fields).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd data-field={label}>{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <section className='input-events'>
        <h2>Application input</h2>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Bounds</th>
              <th>Resource</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id}>
                <td>{event.data.title}</td>
                <td>
                  {event.start.toString()} → {event.end?.toString()}
                </td>
                <td>{event.resourceIds?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
};
const App = () => {
  const [preset, setPreset] = useState<Preset>('ordinary');
  const [mode, setMode] = useState<Mode>('resize-only');
  const [owner, setOwner] = useState<Ownership['mode']>('internal');
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <p>
        Throwaway prototype. Can resizing work without movement or selection? Drag an event edge, or use the preview
        buttons. Uses production hooks, parts and base positioning CSS. React StrictMode is enabled.
      </p>
      <div className='controls'>
        <label>
          Fixture{' '}
          <select value={preset} onChange={event => setPreset(event.target.value as Preset)}>
            {Object.keys(presets).map(key => (
              <option key={key}>{key}</option>
            ))}
          </select>
        </label>
        <label>
          Operations{' '}
          <select value={mode} onChange={event => setMode(event.target.value as Mode)}>
            <option value='resize-only'>Resize only</option>
            <option value='all'>Selection, movement and resizing</option>
          </select>
        </label>
        <label>
          Draft owner{' '}
          <select value={owner} onChange={event => setOwner(event.target.value as Ownership['mode'])}>
            <option value='internal'>internal</option>
            <option value='controlled'>controlled</option>
            <option value='external'>external</option>
          </select>
        </label>
        <button onClick={() => setMounted(value => !value)}>{mounted ? 'Unmount calendar' : 'Mount calendar'}</button>
      </div>
      {mounted && <Harness key={`${preset}:${owner}:${mode}`} preset={preset} owner={owner} mode={mode} />}
    </>
  );
};
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
