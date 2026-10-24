import { calendarFeatures_active } from '#features/calendar-features';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_PointerSettings, Calendar_InputSettings } from '#features/pointer/pointer.types';

export const pointerFeature = (config: Calendar_PointerSettings = {}) =>
  ({
    '~id': 'pointerFeature',
    '~config': config,
    interaction: { settings: 'pointer' },
    requires: ['interactionFeature'],
    constructApi(context) {
      return {
        pointer: {
          settings: (): Calendar_InputSettings => {
            const active = new Set(calendarFeatures_active(context.features, context.view).map(([key]) => key));
            return {
              pointer: {
                ...context.settings<Calendar_PointerSettings>('pointer', {}),
                enabled:
                  active.has('pointerFeature') &&
                  context.settings<Calendar_PointerSettings>('pointer', {}).enabled !== false,
              },
              touch: active.has('touchFeature') ? context.settings('touch', {}) : undefined,
              autoScroll: active.has('autoScrollFeature') ? context.settings('autoScroll', {}) : undefined,
            };
          },
        },
      };
    },
  }) as const satisfies Calendar_ConfiguredFeature;
