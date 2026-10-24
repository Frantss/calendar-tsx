import type {
  Calendar_Api_FeatureMap,
  Calendar_Features,
  Calendar_FeaturesOf,
  Calendar_Options,
  Calendar_PickFeatures,
  Calendar_ValidateFeatures,
  Calendar_Views,
} from '../../src/calendar.types.ts';
import { createRuntime, type Features, type Ownership } from './runtime';

type Dependencies<F> = {
  [K in keyof F]: F[K] extends { requires: readonly (infer R extends string)[] } ? Exclude<R, keyof F> : never;
}[keyof F];
type Active<V extends Calendar_Views, F, W extends keyof V> = Pick<
  F,
  Extract<Exclude<keyof F, keyof Calendar_FeaturesOf<V>> | keyof V[W]['~features'], keyof F>
>;
type MissingByView<V extends Calendar_Views, F> = {
  [W in keyof V]: Dependencies<Active<V, F, W>>;
}[keyof V];
export type ValidateDependencies<V extends Calendar_Views, F> = [Dependencies<F> | MissingByView<V, F>] extends [never]
  ? unknown
  : { features: `Error: missing active prerequisite '${(Dependencies<F> | MissingByView<V, F>) & string}'` };

export type PrototypeOptions<D, R, V extends Calendar_Views, F extends Calendar_Features> = Calendar_Options<
  D,
  R,
  V,
  F
> &
  Calendar_ValidateFeatures<V, NoInfer<F>> &
  ValidateDependencies<V, NoInfer<F>>;

// This facade models a post-descriptor construction phase. Production createCalendar does not have it yet.
export const createTypedRuntime = <D, R, const V extends Calendar_Views, const F extends Features>(
  options: PrototypeOptions<D, R, V, F>,
) => {
  const runtime = createRuntime({
    features: options.features,
    read: () => options,
    ownership: (options as { interactionOwnership?: Ownership }).interactionOwnership,
    emit: proposal => runtime.dispatch(proposal, options),
  });
  return runtime.bind() as Calendar_PickFeatures<Calendar_Api_FeatureMap<D, R>, F>;
};
