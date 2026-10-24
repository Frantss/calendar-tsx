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
export type Calendar_FeatureContext = {
  readonly options: Calendar_Options<any, any, Calendar_Views, Calendar_Features>;
  /** The active view. */
  readonly view: Calendar_View & Record<string, unknown>;
  readonly api: Calendar_Api<Calendar_Views, Calendar_Features>;
  getState: <TValue = unknown>(key: string) => TValue;
  /** Writes an uncontrolled slice or an external atom; a controlled slice only changes when `state` changes. */
  setState: <TValue = unknown>(key: string, updater: (previous: TValue) => TValue) => void;
  /** Feature defaults, then the calendar option `key`, then the active view's `key`; shallow-merged per layer. */
  settings: <TSettings extends object>(key: string, defaults: TSettings) => TSettings;
};

/** A pipeline stage; it reruns when its input or one of its `deps` changes. */
export type Calendar_FeatureStage<TValue> = {
  deps?: (context: Calendar_FeatureContext) => unknown[];
  run: (value: TValue, context: Calendar_FeatureContext) => TValue;
};

/** A constant with no arguments; configuration lives in options and view settings (D29). */
export type Calendar_Feature = {
  getInitialState?: () => Record<string, unknown>;
  /** Option keys that re-derive the layout when their reference changes; other feature options are read untracked. */
  trackedOptions?: readonly string[];
  /** Actions merged onto `api`. */
  constructApi?: (context: Calendar_FeatureContext) => Record<string, unknown>;
  /** Resolves this feature's definitions before normalization, filtering and background splitting (D50). */
  resolveEvents?: (
    source: Calendar_EventSource<unknown>,
    context: Calendar_EventSourceContext,
  ) => Calendar_Event<unknown>[];
  /** Runs after the core sort, in registration order, in the views that list the feature. */
  events?: Calendar_FeatureStage<Calendar_Event<unknown>[]>;
  /** Adds model fields to the built layout, in the views that list the feature. */
  decorate?: Calendar_FeatureStage<Calendar_AnyLayout>;
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
