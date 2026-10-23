import { useCalendarSelector } from '@calendar-tsx/react';

import type { State, ViewKey } from '../core/setup';
import type { AppCalendar } from './app';

// #region toolbar
export const Toolbar = ({ calendar }: { calendar: AppCalendar }) => {
  const context = useCalendarSelector((state: State) => state.context);
  const title = context.period.start.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <header>
      <button onClick={() => calendar.api.prev()}>Previous</button>
      <button onClick={() => calendar.api.today()}>Today</button>
      <button onClick={() => calendar.api.next()}>Next</button>
      <h2>{title}</h2>
      <select value={context.view} onChange={event => calendar.api.setView(event.target.value as ViewKey)}>
        <option value='month'>Month</option>
        <option value='week'>Week</option>
        <option value='day'>Day</option>
        <option value='agenda'>Agenda</option>
      </select>
    </header>
  );
};
// #endregion toolbar
