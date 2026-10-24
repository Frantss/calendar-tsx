import { For, Show, createEffect, createRenderEffect, createSignal, onCleanup, onMount, untrack } from 'solid-js';
import { render } from 'solid-js/web';
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
} from '@calendar-tsx/solid';
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
import { idle, type Ownership, type Selection } from '../../../core/prototypes/interaction-foundation/runtime';
import '../../../core/prototypes/interaction-foundation/bindings/style.css';

const bind = (host: Host, surface: Surface) => {
  let release: (() => void) | undefined;
  onCleanup(() => release?.());
  return (element: HTMLElement) => {
    release = host.register(surface, element);
  };
};
const Preview = (props: { state: HostState; surface: Surface; vertical?: boolean }) => (
  <For each={props.state.previews.filter(preview => preview.surface === surfaceKey(props.surface))}>
    {preview => (
      <div
        class='preview'
        data-preview={preview.surface}
        style={
          props.vertical
            ? { top: `${preview.start * 100}%`, height: `${preview.span * 100}%` }
            : { left: `${preview.start * 100}%`, width: `${preview.span * 100}%` }
        }
      >
        Preview
      </div>
    )}
  </For>
);
const Grid = (props: { model: Calendar_TimeGridLayout<Data, null>; host: Host; state: HostState }) => (
  <TimeGridView model={props.model}>
    <TimeGridViewHeader>
      <For each={props.model.columns}>
        {column => (
          <TimeGridViewColumnHeader column={column}>
            {column.date.toString()} · {column.resource?.title}
          </TimeGridViewColumnHeader>
        )}
      </For>
    </TimeGridViewHeader>
    <TimeGridViewAllDay ref={bind(props.host, { kind: 'allDay' })}>
      <For each={props.model.allDay?.segments}>
        {segment => (
          <TimeGridViewAllDayEvent segment={segment} data-event-id={segment.event.id}>
            {segment.event.data.title}
          </TimeGridViewAllDayEvent>
        )}
      </For>
      <div class='all-day-previews'>
        <Preview state={props.state} surface={{ kind: 'allDay' }} />
      </div>
    </TimeGridViewAllDay>
    <TimeGridViewBody model={props.model}>
      <TimeGridViewAxis>
        <For each={props.model.slots}>
          {slot => (
            <TimeGridViewAxisLabel slot={slot}>
              {slot.time.minute === 0 ? slot.time.toString({ smallestUnit: 'minute' }) : ''}
            </TimeGridViewAxisLabel>
          )}
        </For>
      </TimeGridViewAxis>
      <For each={props.model.columns}>
        {column => (
          <TimeGridViewColumn column={column} ref={bind(props.host, { kind: 'column', key: column.key })}>
            <For each={column.segments}>
              {segment => (
                <TimeGridViewEvent segment={segment} data-event-id={segment.event.id}>
                  {segment.event.data.title}
                </TimeGridViewEvent>
              )}
            </For>
            <Preview state={props.state} surface={{ kind: 'column', key: column.key }} vertical />
          </TimeGridViewColumn>
        )}
      </For>
    </TimeGridViewBody>
  </TimeGridView>
);
const Timeline = (props: { model: Calendar_TimelineLayout<Data, null>; host: Host; state: HostState }) => (
  <TimelineView model={props.model}>
    <TimelineViewHeader>
      <For each={props.model.days}>
        {day => <TimelineViewDayHeader day={day}>{day.date.toString()}</TimelineViewDayHeader>}
      </For>
      <For each={props.model.slots}>
        {slot => (
          <TimelineViewSlotLabel slot={slot}>
            {slot.time.minute === 0 && slot.time.hour % 6 === 0 ? slot.time.toString({ smallestUnit: 'minute' }) : ''}
          </TimelineViewSlotLabel>
        )}
      </For>
    </TimelineViewHeader>
    <TimelineViewBody>
      <For each={props.model.rows}>
        {row => (
          <TimelineViewRow row={row}>
            <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
            <TimelineViewLane row={row} ref={bind(props.host, { kind: 'lane', key: row.key })}>
              <For each={row.segments}>
                {segment => (
                  <TimelineViewEvent segment={segment} data-event-id={segment.event.id}>
                    {segment.event.data.title}
                  </TimelineViewEvent>
                )}
              </For>
              <Preview state={props.state} surface={{ kind: 'lane', key: row.key }} />
            </TimelineViewLane>
          </TimelineViewRow>
        )}
      </For>
    </TimelineViewBody>
  </TimelineView>
);
const Layout = (props: { calendar: Instance; host: Host; state: HostState }) => {
  const model = useCalendarSelector((value: Calendar_StateOf<Instance>) => value.layout);
  const grid = () => {
    const value = model();
    return value.kind === 'timeGrid' ? value : undefined;
  };
  const timeline = () => {
    const value = model();
    return value.kind === 'timeline' ? value : undefined;
  };
  return (
    <>
      <Show when={grid()}>{model => <Grid model={model()} host={props.host} state={props.state} />}</Show>
      <Show when={timeline()}>{model => <Timeline model={model()} host={props.host} state={props.state} />}</Show>
      <Show when={model().kind === 'list'}>
        <p>Display-only list. Interaction features are inactive.</p>
      </Show>
    </>
  );
};
const Harness = (props: { preset: Preset; owner: Ownership['mode'] }) => {
  const setup = createSetup(props.preset);
  const [view, setView] = createSignal<View>('grid');
  const [date, setDate] = createSignal(setup.date);
  const [events, setEvents] = createSignal(setup.events);
  const [selection, setSelection] = createSignal<Selection | null>(null);
  const [controlled, setControlled] = createSignal(idle());
  const calendar = useCalendar(() => ({
    ...optionsFor(setup, view(), events(), selection(), next => {
      setView(next.view);
      setDate(next.date);
    }),
    date: date(),
  }));
  const host = createHost(
    calendar,
    setup,
    props.owner === 'controlled'
      ? { mode: props.owner, read: controlled, onChange: setControlled }
      : props.owner === 'external'
        ? { mode: props.owner, atom: setup.atom }
        : { mode: props.owner },
    proposal => {
      if (proposal.kind === 'select') setSelection(proposal.range);
    },
  );
  const [state, setState] = createSignal(host.getSnapshot());
  createRenderEffect(() => {
    controlled();
    untrack(host.refresh);
  });
  const [root, setRoot] = createSignal<HTMLDivElement>();
  const [pointer, setPointer] = createSignal(true);
  onMount(() => {
    expose(host);
    const disconnect = host.connect();
    const unsubscribe = host.subscribe(() => setState(host.getSnapshot()));
    setState(host.getSnapshot());
    onCleanup(() => {
      unsubscribe();
      disconnect();
    });
  });
  createEffect(() => {
    const element = root();
    if (pointer() && view() !== 'list' && element) onCleanup(untrack(() => host.attach(element)));
  });
  const fields = () => ({
    Session: state().draft.session ? `${state().draft.session!.intent.kind} / ${state().draft.session!.token}` : 'Idle',
    Target: state().draft.session?.target?.at.toString() ?? 'None',
    Candidate: (() => {
      const candidate = state().draft.candidate;
      return candidate
        ? candidate.status === 'valid'
          ? candidate.proposal.kind
          : `${candidate.status}: ${candidate.reason}`
        : 'None';
    })(),
    Outcome: state().draft.outcome ?? 'None',
    Selection: rangeLabel(state().selectedRange),
    Previews:
      state()
        .previews.map(preview => `${preview.surface}: ${preview.start.toFixed(6)} / ${preview.span.toFixed(6)}`)
        .join('; ') || 'None',
    'Base builds / notifications': `${state().counts.baseBuilds} / ${state().counts.baseNotifications}`,
    'Last draft base builds': String(state().counts.lastDraftBuilds),
    'Preview builds / emissions': `${state().counts.previewBuilds} / ${state().counts.emissions}`,
    'Listeners / surfaces / connections': `${state().counts.listeners} / ${state().counts.surfaces} / ${state().counts.connections}`,
  });
  return (
    <>
      <div class='controls'>
        <label>
          View{' '}
          <select value={view()} onChange={event => calendar.api.setView(event.currentTarget.value as View)}>
            <option value='grid'>Time grid</option>
            <option value='timeline'>Timeline</option>
            <option value='list'>Display-only list</option>
          </select>
        </label>
        <label>
          <input type='checkbox' checked={pointer()} onChange={event => setPointer(event.currentTarget.checked)} />{' '}
          Pointer input
        </label>
        <button onClick={() => calendar.api.next()}>Next period</button>
        <span>
          {date().toString()} · {setup.timeZone}
        </span>
      </div>
      <div class='controls'>
        <button onClick={() => host.command('select')}>Preview selection 14–15</button>
        <button onClick={() => host.command('move')}>Preview move to Room B 14:00</button>
        <button onClick={() => host.command('allDay')}>Preview two-day selection</button>
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
          Apply move
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
      <div class='workspace'>
        <div class='canvas' ref={setRoot}>
          <CalendarProvider value={calendar}>
            <Layout calendar={calendar} host={host} state={state()} />
          </CalendarProvider>
        </div>
        <aside class='inspector'>
          <h2>Runtime state</h2>
          <output>{state().message}</output>
          <dl>
            <For each={Object.entries(fields())}>
              {([label, value]) => (
                <div>
                  <dt>{label}</dt>
                  <dd data-field={label}>{value}</dd>
                </div>
              )}
            </For>
          </dl>
        </aside>
      </div>
      <section class='input-events'>
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
            <For each={events()}>
              {event => (
                <tr>
                  <td>{event.data.title}</td>
                  <td>
                    {event.start.toString()} → {event.end?.toString()}
                  </td>
                  <td>{event.resourceIds?.join(', ')}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </section>
    </>
  );
};
const App = () => {
  const [preset, setPreset] = createSignal<Preset>('ordinary');
  const [owner, setOwner] = createSignal<Ownership['mode']>('internal');
  const [mounted, setMounted] = createSignal(true);
  return (
    <>
      <p>Throwaway prototype. Uses production hooks, parts and base positioning CSS.</p>
      <div class='controls'>
        <label>
          Fixture{' '}
          <select value={preset()} onChange={event => setPreset(event.currentTarget.value as Preset)}>
            <For each={Object.keys(presets)}>{key => <option>{key}</option>}</For>
          </select>
        </label>
        <label>
          Draft owner{' '}
          <select value={owner()} onChange={event => setOwner(event.currentTarget.value as Ownership['mode'])}>
            <option value='internal'>internal</option>
            <option value='controlled'>controlled</option>
            <option value='external'>external</option>
          </select>
        </label>
        <button onClick={() => setMounted(value => !value)}>{mounted() ? 'Unmount calendar' : 'Mount calendar'}</button>
      </div>
      <Show keyed when={mounted() ? `${preset()}:${owner()}` : undefined}>
        {key => <Harness preset={key.split(':')[0] as Preset} owner={key.split(':')[1] as Ownership['mode']} />}
      </Show>
    </>
  );
};
const dispose = render(() => <App />, document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.dispose(dispose);
