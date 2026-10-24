import type {
  Calendar_DayGridViewSettings,
  Calendar_LayoutFeature,
  Calendar_ListViewSettings,
  Calendar_Range,
  Calendar_TimeViewSettings,
  Calendar_TimeGridViewSettings,
  Calendar_TimelineViewSettings,
} from '#calendar.types';
import {
  calendarPeriods_groups,
  calendarPeriods_months,
  calendarPeriods_pad,
  calendarPeriods_resolve,
  calendarPeriods_step,
} from '#calendar-periods';
import { layoutDayGrid_build } from '#layout/layout-day-grid';
import { layoutList_build } from '#layout/layout-list';
import { layoutTimeGrid_build } from '#layout/layout-time-grid';
import { layoutTimeline_build } from '#layout/layout-timeline';
import { layoutCoordinates_dates } from '#layout/layout-coordinates';

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
