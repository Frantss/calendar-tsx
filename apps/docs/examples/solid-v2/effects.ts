// #region effect
import { useCalendarSelector } from '@calendar-tsx/solid/v2';
import { createEffect } from 'solid-js';

export const useCalendarDateChange = (onDateChange: (date: string) => void) => {
  const date = useCalendarSelector(state => state.context.date.toString());
  createEffect(date, onDateChange);
};
// #endregion effect
