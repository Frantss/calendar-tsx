import type { Calendar_Views } from '#views/view.types';
import type { Calendar_ConfiguredFeatures } from '#features/feature.types';

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void
  ? I
  : never;
type Registered<V extends Calendar_Views> =
  UnionToIntersection<
    { [K in keyof V]: V[K] extends { features: infer F } ? F : Omit<V[K]['~features'], V[K]['~layout']> }[keyof V]
  > extends infer F extends Calendar_ConfiguredFeatures
    ? F
    : never;
type Bound<V extends Calendar_Views> = {
  [K in keyof V]: Omit<V[K], '~features' | 'features'> & {
    features: { [A in keyof Registered<V>]?: Partial<Registered<V>[A]['~config']> };
    '~features': Pick<V[K]['~features'], Extract<V[K]['~layout'], keyof V[K]['~features']>> & Registered<V>;
  };
};
export const interactionTestViews = <const V extends Calendar_Views>(
  views: V,
): { views: Bound<V>; features: Registered<V> } => {
  const features: Calendar_ConfiguredFeatures = {};
  for (const view of Object.values(views))
    for (const [key, feature] of Object.entries((view as { features?: object }).features ?? view['~features']))
      if (key !== view['~layout']) features[key] = feature as Calendar_ConfiguredFeatures[string];
  const configured = Object.fromEntries(
    Object.entries(views).map(([key, view]) => {
      const definitions = (view as { features?: Record<string, unknown> }).features ?? view['~features'];
      const overrides = Object.fromEntries(
        Object.entries(features)
          .filter(([, feature]) => feature['~config'] !== undefined)
          .map(([alias]) => [alias, alias in definitions ? {} : { enabled: false }]),
      );
      return [key, { ...view, features: overrides, '~features': { ...view['~features'], ...features } }];
    }),
  );
  // Preserve inferred per-view model types while exercising the production registry at construction.
  return { views: configured as unknown as Bound<V>, features: features as Registered<V> };
};
