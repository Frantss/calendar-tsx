import type { Feature, Ownership, Runtime } from './runtime';

declare module '../../src/calendar.types.ts' {
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    interactionFeature: { interactionOwnership?: Ownership };
  }
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    interactionFeature: {
      interactions: Pick<Runtime, 'store' | 'update' | 'commit' | 'cancel' | 'refresh' | 'dispose'>;
    };
  }
}

export const interactionFeature = {
  trackedOptions: [],
  bindRuntime: runtime => ({
    interactions: {
      store: runtime.store,
      update: runtime.update,
      commit: runtime.commit,
      cancel: runtime.cancel,
      refresh: runtime.refresh,
      dispose: runtime.dispose,
    },
  }),
} as const satisfies Feature;
