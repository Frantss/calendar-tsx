import { useCalendarSelector } from '@calendar-tsx/solid';

import type { State, ViewKey } from '../core/setup';
import type { AppCalendar } from './app';

// #region toolbar
export const Toolbar = (props: { calendar: AppCalendar }) => {
  const context = useCalendarSelector((state: State) => state.context);
  const title = () => context().period.start.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <header>
      <button onClick={() => props.calendar.api.prev()}>Previous</button>
      <button onClick={() => props.calendar.api.today()}>Today</button>
      <button onClick={() => props.calendar.api.next()}>Next</button>
      <h2>{title()}</h2>
      <select
        value={context().view}
        onChange={event => props.calendar.api.setView(event.currentTarget.value as ViewKey)}
      >
        <option value='month'>Month</option>
        <option value='week'>Week</option>
        <option value='day'>Day</option>
        <option value='agenda'>Agenda</option>
      </select>
    </header>
  );
};
// #endregion toolbar
