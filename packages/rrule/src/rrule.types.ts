import type { Calendar_EventDisplay } from '@calendar-tsx/core';
import type { RRuleOptions } from 'rrule-temporal';
import type { Temporal } from 'temporal-polyfill';

/** Native rrule-temporal selectors; `start` owns DTSTART and TZID (D50). */
export type Calendar_RRuleOptions = Omit<
  Extract<RRuleOptions<Temporal.ZonedDateTime>, { freq: string }>,
  'dtstart' | 'tzid' | 'until' | 'temporal' | 'cache' | 'rDate' | 'exDate' | 'rscale' | 'skip' | 'byMonth'
> & {
  until?: Temporal.ZonedDateTime | Temporal.PlainDate;
  byMonth?: number[];
};

export type Calendar_RRule = string | Calendar_RRuleOptions;

/** Exclusions inherit the series seed unless `start` supplies their own date, time and zone. */
export type Calendar_RRuleExclusion<
  TDate extends Temporal.ZonedDateTime | Temporal.PlainDate = Temporal.ZonedDateTime | Temporal.PlainDate,
> = string | (Omit<Calendar_RRuleOptions, 'until'> & { start?: TDate; until?: TDate });

type Shared<TData> = {
  id: string;
  '~source': 'rruleFeature';
  rrule: Calendar_RRule;
  resourceIds?: string[];
  display?: Calendar_EventDisplay;
  data: TData;
};

export type Calendar_RRuleTimedEventInput<TData> = Shared<TData> & {
  kind: 'timed';
  exrule?: Calendar_RRuleExclusion<Temporal.ZonedDateTime> | Calendar_RRuleExclusion<Temporal.ZonedDateTime>[];
  start: Temporal.ZonedDateTime;
  /** Elapsed time; years and months are not supported. */
  duration: Temporal.Duration;
  rdate?: Temporal.ZonedDateTime[];
  exdate?: Temporal.ZonedDateTime[];
};

export type Calendar_RRuleAllDayEventInput<TData> = Shared<TData> & {
  kind: 'allDay';
  exrule?: Calendar_RRuleExclusion<Temporal.PlainDate> | Calendar_RRuleExclusion<Temporal.PlainDate>[];
  start: Temporal.PlainDate;
  /** Positive whole weeks/days; defaults to one day. The generated end is inclusive. */
  duration?: Temporal.Duration;
  rdate?: Temporal.PlainDate[];
  exdate?: Temporal.PlainDate[];
};

export type Calendar_RRuleEventInput<TData> =
  | Calendar_RRuleTimedEventInput<TData>
  | Calendar_RRuleAllDayEventInput<TData>;

export type Calendar_RRuleEventDefinition<TData> =
  | Omit<Calendar_RRuleTimedEventInput<TData>, '~source'>
  | Omit<Calendar_RRuleAllDayEventInput<TData>, '~source'>;

declare module '@calendar-tsx/core' {
  interface Calendar_EventInput_FeatureMap<TData> {
    rruleFeature: Calendar_RRuleEventInput<TData>;
  }
}
