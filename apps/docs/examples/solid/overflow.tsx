import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewOverflow } from '@calendar-tsx/solid';
import { createSignal, For, Show } from 'solid-js';

import type { Booking } from '../core/setup';

// #region overflow
export const DayOverflow = (props: { day: Calendar_DayGridDay<Booking> }) => {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <DayGridViewOverflow day={props.day} onClick={() => setOpen(true)}>
        {props.day.hiddenCount > 0 ? `${props.day.hiddenCount} more` : 'More'}
      </DayGridViewOverflow>
      <Show when={open()}>
        <dialog open onClose={() => setOpen(false)}>
          <h3>{props.day.date.toLocaleString('en-US', { dateStyle: 'full' })}</h3>
          <ul>
            <For each={props.day.events}>{event => <li>{event.data.title}</li>}</For>
          </ul>
          <button onClick={() => setOpen(false)}>Close</button>
        </dialog>
      </Show>
    </>
  );
};
// #endregion overflow
