import type { Calendar_Feature } from '#features/feature.types';
import type { Calendar_RecurringEventInput } from '#features/recurrence/recurrence.types';
import { recurrence_resolve } from '#features/recurrence/recurrence-resolver';

export const recurrenceFeature = {
  resolveEvents: (source, context) => recurrence_resolve(source as Calendar_RecurringEventInput<unknown>, context),
} satisfies Calendar_Feature;
