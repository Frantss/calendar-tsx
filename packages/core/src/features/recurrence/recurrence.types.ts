import type { Calendar_EventDisplay } from '#events/event.types';
import type { Temporal } from 'temporal-polyfill';

export type Calendar_RecurrenceWeekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export type Calendar_RecurrenceOptions<
  TDate extends Temporal.ZonedDateTime | Temporal.PlainDate = Temporal.ZonedDateTime | Temporal.PlainDate,
> = {
  interval?: number;
  count?: number;
  until?: TDate;
} & (
  | { freq: 'DAILY'; byDay?: never; wkst?: never }
  | { freq: 'WEEKLY'; byDay?: Calendar_RecurrenceWeekday[]; wkst?: Calendar_RecurrenceWeekday }
);

/** Omitting `start` inherits the parent seed, including its clock time and zone. */
export type Calendar_RecurrenceExclusion<
  TDate extends Temporal.ZonedDateTime | Temporal.PlainDate = Temporal.ZonedDateTime | Temporal.PlainDate,
> = Calendar_RecurrenceOptions<TDate> & { start?: TDate };

type Shared<TData> = {
  id: string;
  '~source': 'recurrenceFeature';
  resourceIds?: string[];
  display?: Calendar_EventDisplay;
  data: TData;
};

export type Calendar_RecurringTimedEventInput<TData> = Shared<TData> & {
  kind: 'timed';
  start: Temporal.ZonedDateTime;
  /** Positive elapsed time, without years or months. */
  duration: Temporal.Duration;
  rrule: Calendar_RecurrenceOptions<Temporal.ZonedDateTime>;
  rdate?: Temporal.ZonedDateTime[];
  exdate?: Temporal.ZonedDateTime[];
  exrule?:
    | Calendar_RecurrenceExclusion<Temporal.ZonedDateTime>
    | Calendar_RecurrenceExclusion<Temporal.ZonedDateTime>[];
};

export type Calendar_RecurringAllDayEventInput<TData> = Shared<TData> & {
  kind: 'allDay';
  start: Temporal.PlainDate;
  /** Positive whole weeks/days; defaults to one day. The generated end is inclusive. */
  duration?: Temporal.Duration;
  rrule: Calendar_RecurrenceOptions<Temporal.PlainDate>;
  rdate?: Temporal.PlainDate[];
  exdate?: Temporal.PlainDate[];
  exrule?: Calendar_RecurrenceExclusion<Temporal.PlainDate> | Calendar_RecurrenceExclusion<Temporal.PlainDate>[];
};

export type Calendar_RecurringEventInput<TData> =
  | Calendar_RecurringTimedEventInput<TData>
  | Calendar_RecurringAllDayEventInput<TData>;

export type Calendar_RecurringEventDefinition<TData> =
  | Omit<Calendar_RecurringTimedEventInput<TData>, '~source'>
  | Omit<Calendar_RecurringAllDayEventInput<TData>, '~source'>;
