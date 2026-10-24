import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_AutoScrollSettings } from '#features/auto-scroll/auto-scroll.types';

export const autoScrollFeature = (config: Calendar_AutoScrollSettings = {}) =>
  ({
    '~id': 'autoScrollFeature',
    '~config': config,
    interaction: { settings: 'autoScroll' },
    requires: ['pointerFeature'],
  }) as const satisfies Calendar_ConfiguredFeature;
