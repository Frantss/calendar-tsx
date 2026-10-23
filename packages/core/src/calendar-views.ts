import type {
  Calendar_ListViewDefinition,
  Calendar_MonthViewDefinition,
  Calendar_TimeGridViewDefinition,
} from '#calendar.types';

export const calendarView_month = (
  options: Omit<Calendar_MonthViewDefinition, 'kind'>,
): Calendar_MonthViewDefinition => ({
  kind: 'month',
  ...options,
});

export const calendarView_timeGrid = (
  options: Omit<Calendar_TimeGridViewDefinition, 'kind'>,
): Calendar_TimeGridViewDefinition => ({
  kind: 'timeGrid',
  ...options,
});

export const calendarView_list = (options: Omit<Calendar_ListViewDefinition, 'kind'>): Calendar_ListViewDefinition => ({
  kind: 'list',
  ...options,
});
