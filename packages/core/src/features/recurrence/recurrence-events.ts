import type {
  Calendar_RecurringTimedEventInput,
  Calendar_RecurringAllDayEventInput,
  Calendar_RecurringEventDefinition,
  Calendar_RecurringEventInput,
} from '#features/recurrence/recurrence.types';

export function createRecurringEvent<TData>(
  event: Omit<Calendar_RecurringTimedEventInput<TData>, '~source'>,
): Calendar_RecurringTimedEventInput<TData>;
export function createRecurringEvent<TData>(
  event: Omit<Calendar_RecurringAllDayEventInput<TData>, '~source'>,
): Calendar_RecurringAllDayEventInput<TData>;
export function createRecurringEvent<TData>(
  event: Calendar_RecurringEventDefinition<TData>,
): Calendar_RecurringEventInput<TData> {
  return { ...event, '~source': 'recurrenceFeature' };
}
