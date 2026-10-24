import type { Temporal } from 'temporal-polyfill';
import type {
  Calendar_Options,
  Calendar_Views,
  Calendar_View,
  Calendar_Api,
  Calendar_EventSource,
  Calendar_EventSourceContext,
  Calendar_Event,
  Calendar_AnyLayout,
  Calendar_Range,
  Calendar_NavigationOptions,
  Calendar_LayoutInput,
} from '#calendar.types';

/** What feature hooks receive. */
export type Calendar_FeatureContext<TConfig = any> = {
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
export type Calendar_Feature<TConfig = any> = {
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
};

/** A feature that also supplies a view kind: navigation and the layout builder. */
export type Calendar_LayoutFeature<TKind extends string = string, TSettings = any> = Calendar_Feature & {
  kind: TKind;
  /** The nominal period around `date`. */
  period: (date: Temporal.PlainDate, settings: TSettings, options: Calendar_NavigationOptions) => Calendar_Range;
  /** The anchor-date envelope for `period`, padding included. */
  range: (period: Calendar_Range, settings: TSettings, options: Calendar_NavigationOptions) => Calendar_Range;
  /** Coarse input dates, including the following morning for overnight windows. Defaults to range. */
  inputRange?: (range: Calendar_Range, settings: TSettings) => Calendar_Range;
  /** The date one period before or after `date`. */
  step: (date: Temporal.PlainDate, settings: TSettings, direction: 1 | -1) => Temporal.PlainDate;
  build: (input: Calendar_LayoutInput<any, any>, settings: TSettings) => Calendar_AnyLayout;
};

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
