import { expect, it } from 'vitest';

import type { Calendar_TimeGridLayout } from '@calendar-tsx/core';
import { TimeGridView_Body, TimeGridView_Column, TimeGridView_Root, useCalendarSelector } from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../default.css';
import '../../compact.css';

import { themesSetup_part, themesSetup_rect, themesSetup_render } from '#tests/themes.setup';

const TimeGrid = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<ThemesSetup_EventData, null>;

  return (
    <TimeGridView_Root model={grid}>
      <TimeGridView_Body model={grid}>
        {grid.columns.map(column => (
          <TimeGridView_Column key={column.key} column={column} />
        ))}
      </TimeGridView_Body>
    </TimeGridView_Root>
  );
};

it('shrinks slots and text over the default theme', async () => {
  await themesSetup_render(<TimeGrid />);
  const root = themesSetup_part('time-grid-root')[0];

  // 48 half-hour slots at 2rem, against 3rem in the default theme
  expect(themesSetup_rect(themesSetup_part('time-grid-body')[0]).height).toBe(48 * 32);
  expect(root && getComputedStyle(root).fontSize).toBe('12px');
});

it('yields to a token set on an ancestor', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.roomy { --calendar-slot-height: 40px; }';

  await themesSetup_render(<TimeGrid />, { className: 'roomy' });

  expect(themesSetup_rect(themesSetup_part('time-grid-body')[0]).height).toBe(48 * 40);
  style.remove();
});
