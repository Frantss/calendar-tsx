import { calendarFeatures_active } from '#features/calendar-features';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
export type Calendar_PointerSettings = { enabled?: boolean; distance?: number };
export type Calendar_TouchSettings = { enabled?: boolean; delay?: number; tolerance?: number };
export type Calendar_AutoScrollSettings = { enabled?: boolean; edge?: number; speed?: number };
export type Calendar_InputSettings = {
  pointer: Calendar_PointerSettings;
  touch?: Calendar_TouchSettings;
  autoScroll?: Calendar_AutoScrollSettings;
};
export type Calendar_PointerApi = { settings: () => Calendar_InputSettings };
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
export const touchFeature = (config: Calendar_TouchSettings = {}) =>
  ({
    '~id': 'touchFeature',
    '~config': config,
    interaction: { settings: 'touch' },
    requires: ['pointerFeature'],
  }) as const satisfies Calendar_ConfiguredFeature;
export const autoScrollFeature = (config: Calendar_AutoScrollSettings = {}) =>
  ({
    '~id': 'autoScrollFeature',
    '~config': config,
    interaction: { settings: 'autoScroll' },
    requires: ['pointerFeature'],
  }) as const satisfies Calendar_ConfiguredFeature;
