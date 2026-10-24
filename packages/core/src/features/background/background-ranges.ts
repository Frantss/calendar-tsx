import { Temporal } from 'temporal-polyfill';
import type { Calendar_Range } from '#dates/date.types';
import type {
  Calendar_BackgroundLayer,
  Calendar_BackgroundRange,
  Calendar_WeeklyRule,
} from '#features/background/background.types';

/** Returns `layer` unchanged; it types the layer where it is written and keeps `kind` a literal (D33). */
export const createBackgroundLayer = <const TKind extends string>(
  layer: Calendar_BackgroundLayer<TKind>,
): Calendar_BackgroundLayer<TKind> => layer;

/** Weekly rules as a layer's `ranges` function; module scope keeps its reference stable (D24). */
export const createWeeklyRanges =
  (rules: Calendar_WeeklyRule[]) =>
  (range: Calendar_Range, timeZone: string): Calendar_BackgroundRange[] => {
    const ranges: Calendar_BackgroundRange[] = [];

    // From the day before, so a rule ending after midnight reaches the first visible day.
    for (
      let date = range.start.subtract({ days: 1 });
      Temporal.PlainDate.compare(date, range.end) <= 0;
      date = date.add({ days: 1 })
    )
      for (const rule of rules) {
        if (!rule.daysOfWeek.includes(date.dayOfWeek as Calendar_WeeklyRule['daysOfWeek'][number])) continue;

        const endDate = Temporal.PlainTime.compare(rule.endTime, rule.startTime) <= 0 ? date.add({ days: 1 }) : date;

        ranges.push({
          start: date.toZonedDateTime({ timeZone, plainTime: rule.startTime }),
          end: endDate.toZonedDateTime({ timeZone, plainTime: rule.endTime }),
        });
      }

    return ranges;
  };
