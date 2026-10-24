import type { Calendar_DayOfWeek } from '#dates/date.types';
import type { Calendar_LayoutKey } from '#layouts/layout.types';
import type {
  Calendar_Features,
  Calendar_ConfiguredFeatures,
  Calendar_FeatureOverride,
  UnionToIntersection,
} from '#features/feature.types';

export type Calendar_DateViewSettings = { hiddenDays?: readonly Calendar_DayOfWeek[] };

export type Calendar_TimeViewSettings = Calendar_DateViewSettings & {
  timeWindow?: { startMinutes: number; endMinutes: number };
};

export type Calendar_DayDuration =
  | { days: number; weeks?: never; months?: never; period?: never }
  | { weeks: number; days?: never; months?: never; period?: never };

export type Calendar_MonthDuration =
  | { months: number; days?: never; weeks?: never; period?: never }
  | { period: 'month' | 'quarter' | 'year'; days?: never; weeks?: never; months?: never };

export type Calendar_DurationSettings = Calendar_DayDuration | Calendar_MonthDuration;

export type Calendar_VisibilitySettings = Calendar_DateViewSettings;

export type Calendar_ResourceGrouping = 'resource' | readonly ['resource'];

/** A view: its settings plus the layout and features it uses. Create views with the `*View` factories (`dayGridView`, …). */
export type Calendar_View<
  TLayout extends Calendar_LayoutKey = Calendar_LayoutKey,
  TKind extends string = string,
  TFeatures extends object = Calendar_Features,
> = {
  kind: TKind;
  '~layout': TLayout;
  '~features': TFeatures;
};

export type Calendar_Views = Record<string, Calendar_View>;

/** Unbound overrides are validated against a registry by `calendarViews`. */
export type Calendar_ViewFeatureSettings<TOverrides extends object> = {
  features?: TOverrides;
};

export type Calendar_ViewOverrides<TFeatures extends Calendar_ConfiguredFeatures> = {
  [K in keyof TFeatures]?: Calendar_FeatureOverride<TFeatures[K]>;
};

export type Calendar_BoundViews<TFeatures extends Calendar_ConfiguredFeatures, TViews extends Calendar_Views> = {
  [K in keyof TViews]: Omit<TViews[K], '~features'> & {
    '~features': Pick<TViews[K]['~features'], Extract<TViews[K]['~layout'], keyof TViews[K]['~features']>> & TFeatures;
  };
};

type ValidateOverrideValue<TAllowed, TValue> = TAllowed extends unknown
  ? TValue extends readonly unknown[]
    ? TAllowed
    : TValue extends object
      ? TAllowed & Record<Exclude<keyof TValue, keyof TAllowed>, never>
      : TAllowed
  : never;

export type Calendar_ValidateOverrides<TFeatures extends Calendar_ConfiguredFeatures, TViews extends Calendar_Views> = {
  [K in keyof TViews]: TViews[K] extends { features: infer TOverrides }
    ? {
        features: {
          [P in keyof TOverrides]: P extends keyof TFeatures
            ? ValidateOverrideValue<Calendar_FeatureOverride<TFeatures[P]>, TOverrides[P]>
            : never;
        };
      }
    : unknown;
};

export type Calendar_FeaturesOf<TViews extends Record<string, { '~features': object }>> = UnionToIntersection<
  TViews[keyof TViews]['~features']
>;

type MissingFeatures<TViews extends Calendar_Views, TFeatures> =
  | Exclude<keyof Calendar_FeaturesOf<TViews>, keyof TFeatures | TViews[keyof TViews]['~layout']>
  | {
      [K in keyof Calendar_FeaturesOf<TViews> & keyof TFeatures]: TFeatures[K] extends Calendar_FeaturesOf<TViews>[K]
        ? never
        : K;
    }[keyof Calendar_FeaturesOf<TViews> & keyof TFeatures];

/** Every feature the views use must be in `features`, with a compatible implementation. Wide views are not checked. */
export type Calendar_ValidateFeatures<
  TViews extends Calendar_Views,
  TFeatures,
> = string extends keyof Calendar_FeaturesOf<TViews>
  ? unknown
  : [MissingFeatures<TViews, TFeatures>] extends [never]
    ? unknown
    : {
        features: `Error: views use '${MissingFeatures<TViews, TFeatures> & string}'; pass the registry used by calendarViews`;
      };
