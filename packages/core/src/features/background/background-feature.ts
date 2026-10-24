import type {
  Calendar_Feature,
  Calendar_TimeGridLayout,
  Calendar_DayGridLayout,
  Calendar_TimelineLayout,
} from '#calendar.types';
import { timeGrid_decorate, dayGrid_decorate, timeline_decorate } from '#features/background/background-layouts';

/** Shades time from `backgrounds` layers in views that list it (D33, D42). */
export const backgroundFeature = {
  trackedOptions: ['backgrounds'],
  decorate: {
    deps: context => [context.options.backgrounds, context.options.timeZone],
    run: (layout, context) => {
      const layers = context.options.backgrounds ?? [];
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
} satisfies Calendar_Feature;
