import type { Calendar_DayGridViewSettings } from '#layouts/day-grid/day-grid.types';
import type { Calendar_ListViewSettings } from '#layouts/list/list.types';
import type { Calendar_Range } from '#dates/date.types';
import type { Calendar_TimeViewSettings } from '#views/view.types';
import type { Calendar_TimeGridViewSettings } from '#layouts/time-grid/time-grid.types';
import type { Calendar_TimelineViewSettings } from '#layouts/timeline/timeline.types';
import type { Calendar_LayoutFeature } from '#features/feature.types';
import {
  calendarPeriods_groups,
  calendarPeriods_months,
  calendarPeriods_pad,
  calendarPeriods_resolve,
  calendarPeriods_step,
} from '#views/periods';
import { layoutDayGrid_build } from '#layouts/day-grid/day-grid';
import { layoutList_build } from '#layouts/list/list';
import { layoutTimeGrid_build } from '#layouts/time-grid/time-grid';
import { layoutTimeline_build } from '#layouts/timeline/timeline';
import { layoutCoordinates_dates } from '#layouts/shared/coordinates';

const inputRange = (range: Calendar_Range, settings: Calendar_TimeViewSettings) =>
  layoutCoordinates_dates(range, settings).inputRange;

export const dayGridLayout: Calendar_LayoutFeature<'dayGrid', Calendar_DayGridViewSettings> = {
  kind: 'dayGrid',
  inputRange,
  period: calendarPeriods_resolve,
  range: (period, settings, { firstDayOfWeek }) => {
    if (settings.days !== undefined || settings.weeks !== undefined) return period;
    if (calendarPeriods_groups(settings.groupBy).includes('month')) {
      const months = calendarPeriods_months(period);
      const last = months[months.length - 1] ?? period.start;
      return {
        start: calendarPeriods_pad(period, firstDayOfWeek).start,
        end: calendarPeriods_pad(
          { start: last, end: last.with({ day: last.daysInMonth }) },
          firstDayOfWeek,
          settings.fixedWeekCount,
        ).end,
      };
    }
    return calendarPeriods_pad(period, firstDayOfWeek, settings.fixedWeekCount);
  },
  step: calendarPeriods_step,
  build: (input, definition) => layoutDayGrid_build({ ...input, definition, today: input.now.toPlainDate() }),
};

export const timeGridLayout: Calendar_LayoutFeature<'timeGrid', Calendar_TimeGridViewSettings> = {
  kind: 'timeGrid',
  inputRange,
  period: calendarPeriods_resolve,
  range: period => period,
  step: calendarPeriods_step,
  build: (input, definition) => layoutTimeGrid_build({ ...input, definition }),
};

export const listLayout: Calendar_LayoutFeature<'list', Calendar_ListViewSettings> = {
  kind: 'list',
  inputRange,
  period: calendarPeriods_resolve,
  range: period => period,
  step: calendarPeriods_step,
  build: (input, definition) => layoutList_build({ ...input, definition }),
};

export const timelineLayout: Calendar_LayoutFeature<'timeline', Calendar_TimelineViewSettings> = {
  kind: 'timeline',
  inputRange,
  period: calendarPeriods_resolve,
  range: period => period,
  step: calendarPeriods_step,
  build: (input, definition) => layoutTimeline_build({ ...input, definition }),
};
