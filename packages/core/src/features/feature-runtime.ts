import { calendarFeatures_config } from '#features/calendar-features';
import { createStore } from '@tanstack/store';

import type {
  Calendar_Atom,
  Calendar_Feature,
  Calendar_FeatureContext,
  Calendar_Features,
  Calendar_FeatureStage,
  Calendar_ConfiguredFeature,
} from '#features/feature.types';
import type { Calendar_Options } from '#calendar/calendar.types';
import type { Calendar_View, Calendar_Views } from '#views/view.types';

type RuntimeInput = Pick<
  Calendar_FeatureContext,
  'options' | 'view' | 'api' | 'layout' | 'onOptionsChange' | 'onMount'
> & {
  readonly calendarState: Calendar_FeatureContext['state'];
  readonly state: Calendar_Options<any, any, Calendar_Views, Calendar_Features>['state'];
};

const deps_equal = (a: unknown[] | undefined, b: unknown[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((dep, index) => dep === b[index]));

export const calendarFeatures_createRuntime = (features: Calendar_Features, input: RuntimeInput) => {
  const entries = Object.entries(features);
  const canonical = Object.fromEntries(
    entries.map(([alias, feature]) => [(feature as Calendar_ConfiguredFeature)['~id'] ?? alias, feature]),
  );
  const initialState: Record<string, unknown> = Object.assign(
    {},
    ...Object.values(features).map(feature => feature.getInitialState?.()),
  );
  const internal = createStore(initialState);
  const atoms = (input.options.atoms ?? {}) as Record<string, Calendar_Atom<unknown> | undefined>;

  const getState = <TValue>(key: string): TValue => {
    const atom = atoms[key];

    if (atom) return atom.state as TValue;

    const controlled = (input.state as Record<string, unknown> | undefined)?.[key];

    return (controlled !== undefined ? controlled : internal.state[key]) as TValue;
  };

  const setState = <TValue>(key: string, updater: (previous: TValue) => TValue) => {
    const next = updater(getState<TValue>(key));
    const atom = atoms[key];

    if (atom) return atom.setState(() => next);
    if ((input.options.state as Record<string, unknown> | undefined)?.[key] !== undefined) return;

    internal.setState(state => ({ ...state, [key]: next }));
  };

  const configs = new WeakMap<Calendar_View, Map<string, unknown>>();
  const contexts = new Map<string, Calendar_FeatureContext>();
  const contextFor = (alias: string): Calendar_FeatureContext => {
    const previous = contexts.get(alias);
    if (previous) return previous;
    const feature = features[alias] as Calendar_ConfiguredFeature;
    const result: Calendar_FeatureContext = {
      features: { ...canonical },
      get state() {
        return input.calendarState;
      },
      get layout() {
        return input.layout;
      },
      onOptionsChange: input.onOptionsChange,
      onMount: input.onMount,
      settings: (key, defaults) => {
        const match = entries.find(([, feature]) => feature.interaction?.settings === key);
        const configured = match ? (match[1] as Calendar_ConfiguredFeature)['~config'] : undefined;
        const override = match ? (input.view as { features?: Record<string, object> }).features?.[match[0]] : undefined;
        const layers = [
          defaults,
          configured,
          (input.options as Record<string, unknown>)[key],
          override,
          input.view[key],
        ];
        const merge = match?.[1].interaction?.mergeSettings;
        return (merge ? merge(layers) : Object.assign({}, ...layers)) as typeof defaults;
      },
      get options() {
        return input.options;
      },
      get view() {
        return input.view;
      },
      get api() {
        return input.api;
      },
      get config() {
        const view = input.view;
        let cached = configs.get(view);
        if (!cached) configs.set(view, (cached = new Map()));
        if (!cached.has(alias))
          cached.set(
            alias,
            calendarFeatures_config(feature, (view as { features?: Record<string, unknown> }).features?.[alias]),
          );
        return cached.get(alias);
      },
      getState,
      setState,
    };
    contexts.set(alias, result);
    return result;
  };

  const stages = new Map<string, { input: unknown; deps: unknown[] | undefined; output: unknown }>();

  const runtime = {
    resolve: (view: Calendar_View, key: string) =>
      (key === view['~layout'] ? (view['~features'] as Calendar_Features)[key] : features[key]) as Calendar_Feature,
    state: (): Record<string, unknown> => {
      const keys = new Set([...Object.keys(internal.state), ...Object.keys(atoms), ...Object.keys(input.state ?? {})]);

      return Object.fromEntries([...keys].map(key => [key, getState(key)]));
    },
    constructApi: (api: object) => {
      for (const [alias, feature] of Object.entries(features))
        Object.assign(api, feature.constructApi?.(contextFor(alias)));
    },
    run: <TValue>(alias: string, key: string, stage: Calendar_FeatureStage<TValue>, value: TValue): TValue => {
      const context = contextFor(alias);
      const deps = [context.config, ...(stage.deps?.(context) ?? [])];
      const cached = stages.get(key);

      if (cached && cached.input === value && deps_equal(cached.deps, deps)) return cached.output as TValue;

      const output = stage.run(value, context);

      stages.set(key, { input: value, deps, output });

      return output;
    },
  };
  return runtime;
};
