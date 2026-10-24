import type { Calendar_LayoutInput } from '#layouts/layout.types';
import {
  calendarFeatures_collect,
  calendarFeatures_active,
  calendarFeatures_validateViews,
} from '#features/calendar-features';
import { calendarFeatures_createRuntime } from '#features/feature-runtime';
import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';

import { intervalClock } from '#calendar/clock';
import { calendarEvents_defaultOrder, calendarEvents_normalize, calendarEvents_overlaps } from '#events/events';
import { calendarSources_createResolver } from '#events/sources';
import { calendarNavigation_resolve, calendarNavigation_view } from '#calendar/navigation';
import type { Calendar_AnyLayout } from '#layouts/layout.types';
import type {
  Calendar_Api,
  Calendar_Instance,
  Calendar_NavigateTarget,
  Calendar_Navigation,
  Calendar_Options,
  Calendar_State,
  Calendar_ViewContext,
} from '#calendar/calendar.types';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_ValidateFeatures, Calendar_Views } from '#views/view.types';
import type {
  Calendar_FeatureContext,
  Calendar_Features,
  Calendar_ConfiguredFeatures,
  Calendar_LayoutFeature,
} from '#features/feature.types';

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

export const createCalendar = <
  TData,
  TResourceData = unknown,
  const TViews extends Calendar_Views = Calendar_Views,
  const TFeatures extends Calendar_ConfiguredFeatures = Calendar_ConfiguredFeatures,
>(
  initial: Calendar_Options<TData, TResourceData, TViews, TFeatures> &
    Calendar_ValidateFeatures<NoInfer<TViews>, NoInfer<TFeatures>>,
): Calendar_Instance<TData, TResourceData, TViews, TFeatures> => {
  let options = initial as unknown as AnyOptions;
  const clock = () => options.clock ?? defaultClock;
  const definitions = { ...initial.features };
  const features = calendarFeatures_collect(options);
  const optionObservers = new Set<() => void>();
  const mountObservers = new Set<() => () => void>();
  const resolveEvents = calendarSources_createResolver(features);

  const persisted = createStore(tracked_from(options, options.initialNow ?? clock().now()));
  const featureRuntime = calendarFeatures_createRuntime(features, {
    get calendarState() {
      return store.state as unknown as Calendar_FeatureContext['state'];
    },
    get layout() {
      const state = store.state;
      const settings = calendarNavigation_view(options.views, options.view);
      return {
        model: state.layout,
        input: layoutInput,
        settings,
        feature: featureRuntime.resolve(settings, settings['~layout']) as Calendar_LayoutFeature,
      };
    },
    onOptionsChange: callback => {
      optionObservers.add(callback);
    },
    onMount: callback => {
      mountObservers.add(callback);
    },
    get options() {
      return options;
    },
    get state() {
      return persisted.state.state;
    },
    get view() {
      return calendarNavigation_view(persisted.state.views, persisted.state.view) as Calendar_FeatureContext['view'];
    },
    get api() {
      return api as unknown as Calendar_FeatureContext['api'];
    },
  });

  const navigation_of = (
    views: Calendar_Views,
    view: string,
    date: Temporal.PlainDate,
  ): Calendar_Navigation<Calendar_Views> => {
    const definition = calendarNavigation_view(views, view);
    const layout = featureRuntime.resolve(definition, definition['~layout']) as Calendar_LayoutFeature;

    return { view, date, ...calendarNavigation_resolve(layout, definition, date, options) };
  };

  let layoutInput: Calendar_LayoutInput<unknown, unknown>;
  const store = createStore((): Calendar_State<TData, TResourceData, TViews, TFeatures> => {
    const input = persisted.state;
    const now = input.now.toZonedDateTimeISO(input.timeZone);
    const definition = calendarNavigation_view(input.views, input.view);
    const active = calendarFeatures_active(features, definition);
    const navigation = navigation_of(input.views, input.view, input.date);
    const viewContext = { ...navigation, kind: definition.kind } as unknown as Calendar_ViewContext<TViews>;
    const order = options.eventOrder;

    const visible = calendarEvents_normalize(
      resolveEvents(input.events, viewContext.inputRange, input.timeZone),
      input.timeZone,
    ).filter(event => calendarEvents_overlaps(event, viewContext.inputRange));
    // Background events are shaded, not laid out: they skip ordering and feature stages (D37).
    const backgroundEvents = visible.filter(event => event.display === 'background');

    let events: Calendar_Event<unknown>[] = visible
      .filter(event => event.display !== 'background')
      .sort((a, b) => (order ? order(a, b, viewContext) : calendarEvents_defaultOrder(a, b)));

    for (const [key, feature] of active)
      if (feature.events) events = featureRuntime.run(key, `${key}:events`, feature.events, events);

    const layout = featureRuntime.resolve(definition, definition['~layout']) as Calendar_LayoutFeature;
    layoutInput = {
      firstDayOfWeek: input.firstDayOfWeek ?? 7,
      range: viewContext.range,
      period: viewContext.period,
      inputRange: viewContext.inputRange,
      events,
      backgroundEvents,
      resources: input.resources ?? [],
      timeZone: input.timeZone,
      now,
    };
    let model: Calendar_AnyLayout = layout.build(layoutInput, definition);

    for (const [key, feature] of active)
      if (feature.decorate) model = featureRuntime.run(key, `${key}:decorate`, feature.decorate, model);

    const featureState = featureRuntime.state();

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
    const layout = featureRuntime.resolve(definition, definition['~layout']) as Calendar_LayoutFeature;

    navigate({ date: layout.step(options.date, definition, direction) });
  };

  const api = {
    next: () => step(1),
    prev: () => step(-1),
    today: () => navigate({ date: clock().now().toZonedDateTimeISO(options.timeZone).toPlainDate() }),
    goTo: (date: Temporal.PlainDate) => navigate({ date }),
    setView: (view: keyof TViews & string, date?: Temporal.PlainDate) => navigate({ view, date }),
    navigate,
  } as Calendar_Api<TViews, TFeatures, TData, TResourceData>;

  featureRuntime.constructApi(api);

  const tick = () =>
    persisted.setState(state => {
      const next = { ...state, now: clock().now() };

      return tracked_equals(state, next) ? state : next;
    });

  let mounts = 0;
  let mountedCleanup: (() => void) | undefined;
  return {
    get options() {
      return options as unknown as Calendar_Options<TData, TResourceData, TViews, TFeatures>;
    },
    store,
    api,
    '~mount': () => {
      if (mounts++ === 0) {
        const cleanups: (() => void)[] = [];
        try {
          tick();
          cleanups.push(clock().subscribe(tick));
          for (const mount of mountObservers) cleanups.push(mount());
        } catch (error) {
          mounts = 0;
          for (const cleanup of cleanups.toReversed()) cleanup();
          throw error;
        }
        mountedCleanup = () => {
          for (const cleanup of cleanups.toReversed()) cleanup();
        };
      }
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (--mounts === 0) {
          mountedCleanup?.();
          mountedCleanup = undefined;
        }
      };
    },
    '~update': next => {
      if (
        Object.keys(next.features).length !== Object.keys(definitions).length ||
        Object.entries(definitions).some(([key, feature]) => next.features[key] !== feature)
      )
        throw new Error('[calendar] feature definitions cannot change after calendar creation');
      if (next.views !== options.views) calendarFeatures_validateViews(definitions, next.views);
      options = next as unknown as AnyOptions;
      persisted.setState(state => {
        const updated = tracked_from(options, state.now);

        return tracked_equals(state, updated) ? state : updated;
      });
      optionObservers.forEach(callback => callback());
    },
  };
};
