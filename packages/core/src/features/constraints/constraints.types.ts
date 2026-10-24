import type { Calendar_BackgroundRange, Calendar_WeeklyRule } from '#features/background/background.types';
import type { Calendar_Range } from '#dates/date.types';
import type { Calendar_InteractionInput, Calendar_InteractionProposal } from '#features/interaction/interaction.types';

export type Calendar_ConstraintSettings = {
  preventOverlap?: boolean;
  allowedRanges?:
    | readonly Calendar_BackgroundRange[]
    | ((range: Calendar_Range, timeZone: string) => readonly Calendar_BackgroundRange[]);
  businessHours?: Calendar_WeeklyRule[];
  resourceAvailability?: boolean;
  resourceIds?: readonly string[];
  allow?: (proposal: Calendar_InteractionProposal, input: Calendar_InteractionInput) => boolean | string;
};
