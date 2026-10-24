import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_BackgroundLayer } from '#features/background/background.types';
import type { Calendar_TimeGridLayout } from '#layouts/time-grid/time-grid.types';
import type { Calendar_DayGridLayout } from '#layouts/day-grid/day-grid.types';
import type { Calendar_TimelineLayout } from '#layouts/timeline/timeline.types';
import { timeGrid_decorate, dayGrid_decorate, timeline_decorate } from '#features/background/background-layouts';

const validate = (value: unknown) => {
  if (!Array.isArray(value)) throw new Error('[calendar] background configuration must be an array of layers');
};

/** Configures background layers inherited by each view. */
export const backgroundFeature = (layers: readonly Calendar_BackgroundLayer[] = []) =>
  ({
    '~id': 'backgroundFeature',
    '~config': layers,
    '~validateConfig': validate,
    decorate: {
      deps: context => [context.config, context.options.timeZone],
      run: (layout, context) => {
        const layers = context.config;
        const { timeZone } = context.options;

        if (layout.kind === 'timeGrid')
          return timeGrid_decorate(layout as Calendar_TimeGridLayout<unknown, unknown>, layers, timeZone);
        if (layout.kind === 'dayGrid')
          return dayGrid_decorate(layout as Calendar_DayGridLayout<unknown>, layers, timeZone);
        if (layout.kind === 'timeline')
          return timeline_decorate(layout as Calendar_TimelineLayout<unknown, unknown>, layers, timeZone);

        return layout;
      },
    },
  }) satisfies Calendar_ConfiguredFeature<'backgroundFeature', readonly Calendar_BackgroundLayer[]>;
