import type {
  Calendar_Features,
  Calendar_ConfiguredFeatures,
  Calendar_ConfiguredFeature,
} from '#features/feature.types';
import type { Calendar_Options } from '#calendar/calendar.types';
import type { Calendar_Views, Calendar_View } from '#views/view.types';

export const calendarFeatures_validate = (features: Calendar_ConfiguredFeatures) => {
  const identities = new Set<string>();
  for (const [alias, feature] of Object.entries(features)) {
    if (!feature || typeof feature['~id'] !== 'string' || !feature['~id'])
      throw new Error(`[calendar] feature "${alias}" must be a configured factory result`);
    if (identities.has(feature['~id']))
      throw new Error(`[calendar] feature "${feature['~id']}" is registered more than once`);
    identities.add(feature['~id']);
    feature['~validateConfig']?.(feature['~config']);
  }
};

/** Collects configured definitions without creating calendar state. */
export const calendarFeatures = <const TFeatures extends Calendar_ConfiguredFeatures>(
  features: TFeatures,
): TFeatures => {
  calendarFeatures_validate(features);
  return { ...features };
};

export const calendarFeatures_config = (feature: Calendar_ConfiguredFeature, override: unknown): unknown => {
  const defaults: unknown = feature['~config'];
  const config =
    override === undefined
      ? defaults
      : defaults !== null &&
          typeof defaults === 'object' &&
          !Array.isArray(defaults) &&
          override !== null &&
          typeof override === 'object' &&
          !Array.isArray(override)
        ? { ...defaults, ...override }
        : override;
  if (defaults === undefined && override !== undefined)
    throw new Error(`[calendar] feature "${feature['~id']}" does not accept configuration overrides`);
  feature['~validateConfig']?.(config);
  return config;
};

export const calendarFeatures_validateViews = (features: Calendar_ConfiguredFeatures, views: Calendar_Views) => {
  for (const [key, view] of Object.entries(views)) {
    if (Object.hasOwn(features, view['~layout']))
      throw new Error(`[calendar] feature key "${view['~layout']}" conflicts with a layout`);
    for (const [alias, feature] of Object.entries(view['~features'])) {
      if (alias === view['~layout']) continue;
      if (
        !Object.hasOwn(features, alias) ||
        features[alias]?.['~id'] !== (feature as Calendar_ConfiguredFeature)['~id']
      )
        throw new Error(`[calendar] view "${key}" requires registered feature "${alias}"`);
    }
    for (const [alias, override] of Object.entries((view as { features?: object }).features ?? {})) {
      if (!Object.hasOwn(features, alias))
        throw new Error(`[calendar] unknown feature override "${alias}" in view "${key}"`);
      calendarFeatures_config(features[alias]!, override);
    }
  }
};

export const calendarFeatures_collect = (options: Calendar_Options<any, any, Calendar_Views, Calendar_Features>) => {
  calendarFeatures_validate(options.features as Calendar_ConfiguredFeatures);
  calendarFeatures_validateViews(options.features as Calendar_ConfiguredFeatures, options.views);
  const all: Calendar_Features = { ...options.features };
  for (const view of Object.values(options.views))
    all[view['~layout']] ??= (view['~features'] as Calendar_Features)[view['~layout']]!;
  return all;
};

/** Layout hooks run for their own view; configured features run in every view. */
export const calendarFeatures_active = (all: Calendar_Features, view: Calendar_View) => [
  ...Object.entries(all).filter(([, feature]) => !('kind' in feature && 'build' in feature)),
  [view['~layout'], (view['~features'] as Calendar_Features)[view['~layout']]!] as [
    string,
    import('#features/feature.types').Calendar_Feature,
  ],
];
