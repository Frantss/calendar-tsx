import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_TouchSettings } from '#features/touch/touch.types';

export const touchFeature = (config: Calendar_TouchSettings = {}) =>
  ({
    '~id': 'touchFeature',
    '~config': config,
    interaction: { settings: 'touch' },
    requires: ['pointerFeature'],
  }) as const satisfies Calendar_ConfiguredFeature;
