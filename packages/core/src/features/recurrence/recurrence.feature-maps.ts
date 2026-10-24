import type { Calendar_RecurringEventInput } from '#features/recurrence/recurrence.types';

export interface Recurrence_EventInput_FeatureMap<TData> {
  recurrenceFeature: Calendar_RecurringEventInput<TData>;
}
