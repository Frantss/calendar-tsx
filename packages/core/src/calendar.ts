import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';

import { intervalClock } from '#calendar-clock';
import { calendarEvents_defaultOrder, calendarEvents_normalize, calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_resolve, calendarNavigation_view } from '#calendar-navigation';
import type {
  Calendar_AnyLayout,
  Calendar_Api,
  Calendar_Atom,
  Calendar_Event,
  Calendar_Feature,
  Calendar_FeatureContext,
  Calendar_Features,
  Calendar_FeatureStage,
  Calendar_Instance,
  Calendar_LayoutFeature,
  Calendar_NavigateTarget,
  Calendar_Navigation,
  Calendar_Options,
  Calendar_State,
  Calendar_ValidateFeatures,
  Calendar_View,
  Calendar_ViewContext,
  Calendar_Views,
} from '#calendar.types';

const defaultClock = intervalClock({ every: Temporal.Duration.from({ minutes: 1 }) });

type AnyOptions = Calendar_Options<any, any, Calendar_Views, Calendar_Features>;

/** Inputs the layout depends on; everything else on the options is read untracked (D24). */
type Tracked = Pick<
  AnyOptions,
  'timeZone' | 'views' | 'view' | 'date' | 'events' | 'resources' | 'firstDayOfWeek' | 'state'
> & { now: Temporal.Instant };

const tracked_from = (options: AnyOptions, now: Temporal.Instant): Tracked => ({
  timeZone: options.timeZone,
  views: options.views,
  view: options.view,
  date: options.date,
  events: options.events,
  resources: options.resources,
  firstDayOfWeek: options.firstDayOfWeek,
  state: options.state,
  now,
});

const records_equal = (a: Record<string, unknown> = {}, b: Record<string, unknown> = {}) => {
  const keys = Object.keys(a);

  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
};

const tracked_equals = (a: Tracked, b: Tracked) =>
  a.timeZone === b.timeZone &&
  a.views === b.views &&
  a.view === b.view &&
  a.date.equals(b.date) &&
  a.events === b.events &&
  a.resources === b.resources &&
  a.firstDayOfWeek === b.firstDayOfWeek &&
  records_equal(a.state, b.state) &&
  a.now.equals(b.now);

/** Every feature the calendar registers, then any a view declares that `features` leaves out (D29). */
const features_all = (options: AnyOptions) => {
  const all: Calendar_Features = { ...options.features };

  for (const view of Object.values(options.views))
    for (const [key, feature] of Object.entries(view['~features'])) all[key] ??= feature;

  return all;
};

/** The features that take part in a view: those it lists, plus calendar-wide ones no view lists. */
const features_active = (all: Calendar_Features, views: Calendar_Views, view: Calendar_View) => {
  const declared = new Set(Object.values(views).flatMap(definition => Object.keys(definition['~features'])));

  return Object.entries(all).filter(([key]) => !declared.has(key) || key in view['~features']);
};

const deps_equal = (a: unknown[] | undefined, b: unknown[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((dep, index) => dep === b[index]));

export const createCalendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_Features = Calendar_Features,
>(
  initial: Calendar_Options<TData, TResourceData, TViews, TFeatures> & Calendar_ValidateFeatures<TViews, TFeatures>,
): Calendar_Instance<TData, TResourceData, TViews, TFeatures> => {
  let options = initial as AnyOptions;
  const clock = () => options.clock ?? defaultClock;
  const features = features_all(options);

  const persisted = createStore(tracked_from(options, options.initialNow ?? clock().now()));
  const initialState: Record<string, unknown> = Object.assign(
    {},
    ...Object.values(features).map(feature => feature.getInitialState?.()),
  );
  const internal = createStore(initialState);
  const atoms = (options.atoms ?? {}) as Record<string, Calendar_Atom<unknown> | undefined>;
  const stateKeys = () =>
    new Set([...Object.keys(internal.state), ...Object.keys(atoms), ...Object.keys(persisted.state.state ?? {})]);

  // Controlled slices are read from `persisted`, so derivation tracks them alongside the other inputs.
  const getState = <TValue>(key: string): TValue => {
    const atom = atoms[key];

    if (atom) return atom.state as TValue;

    const controlled = (persisted.state.state as Record<string, unknown> | undefined)?.[key];

    return (controlled !== undefined ? controlled : internal.state[key]) as TValue;
  };

  const setState = <TValue>(key: string, updater: (previous: TValue) => TValue) => {
    const next = updater(getState<TValue>(key));
    const atom = atoms[key];

    if (atom) return atom.setState(() => next);
    if ((options.state as Record<string, unknown> | undefined)?.[key] !== undefined) return;

    internal.setState(state => ({ ...state, [key]: next }));
  };

  const resolve = (view: Calendar_View, key: string) =>
    (features[key] ?? (view['~features'] as Calendar_Features)[key]) as Calendar_Feature;

  const navigation_of = (
    views: Calendar_Views,
    view: string,
    date: Temporal.PlainDate,
  ): Calendar_Navigation<Calendar_Views> => {
    const definition = calendarNavigation_view(views, view);
    const layout = resolve(definition, definition['~layout']) as Calendar_LayoutFeature;

    return { view, date, ...calendarNavigation_resolve(layout, definition, date, options) };
  };

  const context: Calendar_FeatureContext = {
    get options() {
      return options;
    },
    get view() {
      return calendarNavigation_view(persisted.state.views, persisted.state.view) as Calendar_FeatureContext['view'];
    },
    get api() {
      return api as unknown as Calendar_FeatureContext['api'];
    },
    getState,
    setState,
    settings: (key, defaults) => ({
      ...defaults,
      ...((options as Record<string, unknown>)[key] as object | undefined),
      ...((context.view as Record<string, unknown>)[key] as object | undefined),
    }),
  };

  const stages = new Map<string, { input: unknown; deps: unknown[] | undefined; output: unknown }>();

  const stage_run = <TValue>(key: string, stage: Calendar_FeatureStage<TValue>, input: TValue): TValue => {
    const deps = stage.deps?.(context);
    const cached = stages.get(key);

    if (cached && cached.input === input && deps_equal(cached.deps, deps)) return cached.output as TValue;

    const output = stage.run(input, context);

    stages.set(key, { input, deps, output });

    return output;
  };

  const store = createStore((): Calendar_State<TData, TResourceData, TViews, TFeatures> => {
    const input = persisted.state;
    const now = input.now.toZonedDateTimeISO(input.timeZone);
    const definition = calendarNavigation_view(input.views, input.view);
    const active = features_active(features, input.views, definition);
    const navigation = navigation_of(input.views, input.view, input.date);
    const viewContext = { ...navigation, kind: definition.kind } as unknown as Calendar_ViewContext<TViews>;
    const order = options.eventOrder;

    let events: Calendar_Event<unknown>[] = calendarEvents_normalize(input.events, input.timeZone)
      .filter(event => calendarEvents_overlaps(event, viewContext.range))
      .sort((a, b) => (order ? order(a, b, viewContext) : calendarEvents_defaultOrder(a, b)));

    for (const [key, feature] of active)
      if (feature.events) events = stage_run(`${key}:events`, feature.events, events);

    const layout = resolve(definition, definition['~layout']) as Calendar_LayoutFeature;
    let model: Calendar_AnyLayout = layout.build(
      {
        range: viewContext.range,
        period: viewContext.period,
        events,
        resources: input.resources ?? [],
        timeZone: input.timeZone,
        now,
      },
      definition,
    );

    for (const [key, feature] of active)
      if (feature.decorate) model = stage_run(`${key}:decorate`, feature.decorate, model);

    const featureState = Object.fromEntries([...stateKeys()].map(key => [key, getState(key)]));

    return { ...featureState, context: viewContext, layout: model, now } as Calendar_State<
      TData,
      TResourceData,
      TViews,
      TFeatures
    >;
  });

  const navigate = (target: Calendar_NavigateTarget<TViews>) => {
    options.onNavigate(navigation_of(options.views, target.view ?? options.view, target.date ?? options.date));
  };

  const step = (direction: 1 | -1) => {
    const definition = calendarNavigation_view(options.views, options.view);
    const layout = resolve(definition, definition['~layout']) as Calendar_LayoutFeature;

    navigate({ date: layout.step(options.date, definition, direction) });
  };

  const api = {
    next: () => step(1),
    prev: () => step(-1),
    today: () => navigate({ date: clock().now().toZonedDateTimeISO(options.timeZone).toPlainDate() }),
    goTo: (date: Temporal.PlainDate) => navigate({ date }),
    setView: (view: keyof TViews & string, date?: Temporal.PlainDate) => navigate({ view, date }),
    navigate,
  } as Calendar_Api<TViews, TFeatures>;

  for (const feature of Object.values(features)) Object.assign(api, feature.constructApi?.(context));

  const tick = () =>
    persisted.setState(state => {
      const next = { ...state, now: clock().now() };

      return tracked_equals(state, next) ? state : next;
    });

  return {
    get options() {
      return options as Calendar_Options<TData, TResourceData, TViews, TFeatures>;
    },
    store,
    api,
    '~mount': () => {
      tick();

      return clock().subscribe(tick);
    },
    '~update': next => {
      options = next as AnyOptions;
      persisted.setState(state => {
        const updated = tracked_from(options, state.now);

        return tracked_equals(state, updated) ? state : updated;
      });
    },
  };
};
