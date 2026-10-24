import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewOverflow } from '@calendar-tsx/react';
import { useState } from 'react';

import type { Booking } from '../core/setup';

// #region overflow
export const DayOverflow = ({ day }: { day: Calendar_DayGridDay<Booking> }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DayGridViewOverflow day={day} onClick={() => setOpen(true)}>
        {day.hiddenCount > 0 ? `${day.hiddenCount} more` : 'More'}
      </DayGridViewOverflow>
      {open && (
        <dialog open onClose={() => setOpen(false)}>
          <h3>{day.date.toLocaleString('en-US', { dateStyle: 'full' })}</h3>
          <ul>
            {day.events.map(event => (
              <li key={event.id}>{event.data.title}</li>
            ))}
          </ul>
          <button onClick={() => setOpen(false)}>Close</button>
        </dialog>
      )}
    </>
  );
};
// #endregion overflow
