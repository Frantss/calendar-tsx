import type { Calendar_State_FeatureMap } from '#features/feature-maps.types';
import type { Temporal } from 'temporal-polyfill';
import type { Calendar_Options, Calendar_Api, Calendar_NavigationOptions } from '#calendar/calendar.types';
import type { Calendar_Views, Calendar_View } from '#views/view.types';
import type { Calendar_EventSource, Calendar_EventSourceContext, Calendar_Event } from '#events/event.types';
import type { Calendar_AnyLayout, Calendar_LayoutInput } from '#layouts/layout.types';
import type { Calendar_Range } from '#dates/date.types';

/** What feature hooks receive. */
export type Calendar_FeatureContext<TConfig = any> = {
  readonly features: Calendar_Features;
  readonly state: import('#calendar/calendar.types').Calendar_State<unknown, unknown, Calendar_Views, Calendar_Features>;
  readonly layout: import('#calendar-layout-interaction.types').Calendar_ActiveLayout;
  onOptionsChange: (callback: () => void) => void;
  onMount: (callback: () => () => void) => void;
  settings: <TSettings>(key: string, defaults: TSettings) => TSettings;
  readonly config: TConfig;
  readonly options: Calendar_Options<any, any, Calendar_Views, Calendar_Features>;
  /** The active view. */
  readonly view: Calendar_View & Record<string, unknown>;
  readonly api: Calendar_Api<Calendar_Views, Calendar_Features>;
  getState: <TValue = unknown>(key: string) => TValue;
  /** Writes an uncontrolled slice or an external atom; a controlled slice only changes when `state` changes. */
  setState: <TValue = unknown>(key: string, updater: (previous: TValue) => TValue) => void;
};

/** A pipeline stage; it reruns when its input or one of its `deps` changes. */
export type Calendar_FeatureStage<TValue, TConfig = any> = {
  deps?: (context: Calendar_FeatureContext<TConfig>) => unknown[];
  run: (value: TValue, context: Calendar_FeatureContext<TConfig>) => TValue;
};

/** Hooks supplied by a feature definition. */
export interface Calendar_FeatureExtensions {
  interaction?: import('#calendar-interaction.types').Calendar_InteractionContribution;
}
export type Calendar_Feature<TConfig = any> = {
  requires?: readonly string[];
  getInitialState?: () => Record<string, unknown>;
  /** Actions merged onto `api`. */
  constructApi?: (context: Calendar_FeatureContext<TConfig>) => Record<string, unknown>;
  /** Resolves this feature's definitions before normalization, filtering and background splitting (D50). */
  resolveEvents?: (
    source: Calendar_EventSource<unknown>,
    context: Calendar_EventSourceContext,
  ) => Calendar_Event<unknown>[];
  /** Runs after the core sort, in registration order, in every view. */
  events?: Calendar_FeatureStage<Calendar_Event<unknown>[], TConfig>;
  /** Adds model fields to the built layout, in every view. */
  decorate?: Calendar_FeatureStage<Calendar_AnyLayout, TConfig>;
} & Calendar_FeatureExtensions;

/** A feature that also supplies a view kind: navigation and the layout builder. */
export type Calendar_LayoutFeature<
  TKind extends string = string,
  TSettings = any,
  TModel extends Calendar_AnyLayout = Calendar_AnyLayout,
> = Calendar_Feature & {
  kind: TKind;
  /** The nominal period around `date`. */
  period: (date: Temporal.PlainDate, settings: TSettings, options: Calendar_NavigationOptions) => Calendar_Range;
  /** The anchor-date envelope for `period`, padding included. */
  range: (period: Calendar_Range, settings: TSettings, options: Calendar_NavigationOptions) => Calendar_Range;
  /** Coarse input dates, including the following morning for overnight windows. Defaults to range. */
  inputRange?: (range: Calendar_Range, settings: TSettings) => Calendar_Range;
  /** The date one period before or after `date`. */
  step: (date: Temporal.PlainDate, settings: TSettings, direction: 1 | -1) => Temporal.PlainDate;
  build: (input: Calendar_LayoutInput<any, any>, settings: TSettings) => TModel;
} & import('#calendar-layout-interaction.types').Calendar_LayoutCapabilities<TKind, TModel, TSettings>;

export type Calendar_Features = Record<string, Calendar_Feature>;

/** A factory result with an identity independent of its registry key (D54). */
export type Calendar_ConfiguredFeature<TId extends string = string, TConfig = any> = Calendar_Feature<TConfig> & {
  readonly '~id': TId;
  readonly '~config': TConfig;
  readonly '~validateConfig'?: (config: unknown) => void;
};

export type Calendar_ConfiguredFeatures = Record<string, Calendar_ConfiguredFeature>;

/** Canonical feature keys for declaration maps, independent of consumer aliases. */
export type Calendar_FeatureTypes<TFeatures> = {
  [K in keyof TFeatures as TFeatures[K] extends { readonly '~id': infer TId extends string } ? TId : K]: TFeatures[K];
};

export type Calendar_FeatureOverride<TFeature> =
  TFeature extends Calendar_ConfiguredFeature<string, infer TConfig>
    ? TConfig extends undefined
      ? never
      : TConfig extends readonly unknown[]
        ? Readonly<TConfig>
        : TConfig extends object
          ? Partial<TConfig>
          : TConfig
    : never;

export type UnionToIntersection<U> = (U extends unknown ? (union: U) => void : never) extends (
  intersection: infer I,
) => void
  ? I
  : never;

/**
 * The contributions of the registered features to a feature map (D29). Wide feature types (the defaults) pick every
 * entry, so code that does not name its features sees everything a feature could add.
 */
export type Calendar_PickFeatures<TMap, TFeatures> = string extends keyof TFeatures
  ? UnionToIntersection<TMap[keyof TMap]> extends infer TAll
    ? [TAll] extends [never]
      ? {}
      : TAll
    : never
  : UnionToIntersection<TMap[Extract<keyof TFeatures, keyof TMap>]> extends infer TPicked
    ? [TPicked] extends [never]
      ? {}
      : TPicked
    : never;

/** A store a feature slice can live in; TanStack Store's `Store` fits. */
export type Calendar_Atom<TValue> = {
  readonly state: TValue;
  setState: (updater: (previous: TValue) => TValue) => void;
};

export type Calendar_FeatureState<TFeatures> = Calendar_PickFeatures<
  Calendar_State_FeatureMap,
  Calendar_FeatureTypes<TFeatures>
>;
