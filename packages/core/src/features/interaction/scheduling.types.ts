import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_Selection } from '#features/date-selection/date-selection.types';

export type Calendar_SchedulingEffect =
  | { kind: 'range'; range: Calendar_Selection }
  | { kind: 'event'; event: Calendar_EventInput<unknown>; excludeEventId?: string };

export type Calendar_EventRelocationPolicy = {
  allowConversion?: boolean;
  conversionDuration?: 'reset' | 'preserve';
  defaultTimedMinutes?: number;
  allowResourceChange?: boolean;
  resourceMode?: 'replace-all' | 'replace-source';
};
