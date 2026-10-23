import { intervalClock } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

// #region clock
// tick every 15 seconds instead of every minute
export const clock = intervalClock({ every: Temporal.Duration.from({ seconds: 15 }) });
// #endregion clock
