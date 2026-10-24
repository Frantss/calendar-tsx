import type { Calendar_TouchSettings } from '#features/touch/touch.types';
import type { Calendar_AutoScrollSettings } from '#features/auto-scroll/auto-scroll.types';

export type Calendar_PointerSettings = { enabled?: boolean; distance?: number };

export type Calendar_InputSettings = {
  pointer: Calendar_PointerSettings;
  touch?: Calendar_TouchSettings;
  autoScroll?: Calendar_AutoScrollSettings;
};

export type Calendar_PointerApi = { settings: () => Calendar_InputSettings };
