import { createStore } from '@tanstack/store';

import type { Calendar_Atom, Calendar_Options, Calendar_View, Calendar_Views } from '#calendar.types';
import type {
  Calendar_Feature,
  Calendar_FeatureContext,
  Calendar_Features,
  Calendar_FeatureStage,
} from '#features/feature.types';

type RuntimeInput = Pick<Calendar_FeatureContext, 'options' | 'view' | 'api'> & {
  readonly state: Calendar_Options<any, any, Calendar_Views, Calendar_Features>['state'];
};

const deps_equal = (a: unknown[] | undefined, b: unknown[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((dep, index) => dep === b[index]));

export const calendarFeatures_createRuntime = (features: Calendar_Features, input: RuntimeInput) => {
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

  const context: Calendar_FeatureContext = {
    get options() {
      return input.options;
    },
    get view() {
      return input.view;
    },
    get api() {
      return input.api;
    },
    getState,
    setState,
    settings: (key, defaults) => ({
      ...defaults,
      ...((input.options as Record<string, unknown>)[key] as object | undefined),
      ...((input.view as Record<string, unknown>)[key] as object | undefined),
    }),
  };

  const stages = new Map<string, { input: unknown; deps: unknown[] | undefined; output: unknown }>();

  return {
    resolve: (view: Calendar_View, key: string) =>
      (features[key] ?? (view['~features'] as Calendar_Features)[key]) as Calendar_Feature,
    state: () => {
      const keys = new Set([...Object.keys(internal.state), ...Object.keys(atoms), ...Object.keys(input.state ?? {})]);

      return Object.fromEntries([...keys].map(key => [key, getState(key)]));
    },
    constructApi: (api: object) => {
      for (const feature of Object.values(features)) Object.assign(api, feature.constructApi?.(context));
    },
    run: <TValue>(key: string, stage: Calendar_FeatureStage<TValue>, value: TValue): TValue => {
      const deps = stage.deps?.(context);
      const cached = stages.get(key);

      if (cached && cached.input === value && deps_equal(cached.deps, deps)) return cached.output as TValue;

      const output = stage.run(value, context);

      stages.set(key, { input: value, deps, output });

      return output;
    },
  };
};
