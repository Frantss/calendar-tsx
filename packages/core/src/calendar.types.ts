import type { ReadonlyStore } from '@tanstack/store';
import type { Temporal } from 'temporal-polyfill';

export type Calendar_TimedEventInput<TData> = {
  id: string;
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  resourceIds?: string[];
  data: TData;
};

export type Calendar_AllDayEventInput<TData> = {
  id: string;
  allDay: true;
  start: Temporal.PlainDate;
  /** Inclusive; defaults to `start`. */
  end?: Temporal.PlainDate;
  resourceIds?: string[];
  data: TData;
};

export type Calendar_EventInput<TData> = Calendar_TimedEventInput<TData> | Calendar_AllDayEventInput<TData>;

/** An input after normalization: timed events are expressed in the calendar's `timeZone`. */
export type Calendar_Event<TData> = Calendar_EventInput<TData>;

export type Calendar_Availability = { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime };

export type Calendar_Resource<TResourceData> = {
  id: string;
  title: string;
  availability: Calendar_Availability[];
  data: TResourceData;
};

export type Calendar_Clock = {
  now: () => Temporal.Instant;
  subscribe: (onTick: () => void) => () => void;
};

export type Calendar_MonthViewDefinition = {
  kind: 'month';
  maxEventsPerDay: number;
  dayOverflow?: (date: Temporal.PlainDate) => boolean;
};

export type Calendar_TimeGridViewDefinition = {
  kind: 'timeGrid';
  days: number;
  groupBy?: 'resource';
  groupOrder?: 'resource-first' | 'date-first';
  allDay?: boolean;
  slotMinutes?: number;
  minColumnWidth?: string;
};

export type Calendar_ListViewDefinition = { kind: 'list'; days: number };

export type Calendar_ViewDefinition =
  | Calendar_MonthViewDefinition
  | Calendar_TimeGridViewDefinition
  | Calendar_ListViewDefinition;

export type Calendar_Views = Record<string, Calendar_ViewDefinition>;

export type Calendar_Range = { start: Temporal.PlainDate; end: Temporal.PlainDate };

export type Calendar_FirstDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Calendar_Navigation<TViews extends Calendar_Views> = {
  view: keyof TViews & string;
  date: Temporal.PlainDate;
  /** Visible days, including month padding. */
  range: Calendar_Range;
  /** Nominal day, week or month. */
  period: Calendar_Range;
};

export type Calendar_ViewContext<TViews extends Calendar_Views> = Calendar_Navigation<TViews> & {
  kind: Calendar_ViewDefinition['kind'];
};

export type Calendar_Options<TData, TResourceData, TViews extends Calendar_Views> = {
  timeZone: string;
  locale?: string;
  views: TViews;
  view: keyof TViews & string;
  date: Temporal.PlainDate;
  onNavigate: (next: Calendar_Navigation<TViews>) => void;
  /** Ids must be unique; tracked by reference. */
  events: Calendar_EventInput<TData>[];
  /** Tracked by reference. */
  resources?: Calendar_Resource<TResourceData>[];
  /** Read when the layout derives; changing it alone does not re-derive. */
  eventOrder?: (a: Calendar_Event<TData>, b: Calendar_Event<TData>, context: Calendar_ViewContext<TViews>) => number;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
  clock?: Calendar_Clock;
};

export type Calendar_MonthDay<TData> = {
  key: string;
  date: Temporal.PlainDate;
  isOutside: boolean;
  isToday: boolean;
  /** Hidden rows crossing this day; not the true total when the input was truncated. */
  hiddenCount: number;
  hasMore: boolean;
  events: Calendar_Event<TData>[];
};

export type Calendar_BarSegment<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  colStart: number;
  colSpan: number;
  row: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_MonthWeek<TData> = {
  key: string;
  days: Calendar_MonthDay<TData>[];
  segments: Calendar_BarSegment<TData>[];
  rows: number;
};

export type Calendar_MonthLayout<TData> = {
  kind: 'month';
  weekdays: Temporal.PlainDate[];
  weeks: Calendar_MonthWeek<TData>[];
};

export type Calendar_TimeGridSegment<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  /** Fractions of the column's day. */
  start: number;
  span: number;
  lane: number;
  lanes: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_UnavailableSegment = { key: string; start: number; span: number };

export type Calendar_TimeGridColumn<TData, TResourceData> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  isToday: boolean;
  isUnavailable: boolean;
  segments: Calendar_TimeGridSegment<TData>[];
  unavailable: Calendar_UnavailableSegment[];
  now?: number;
};

export type Calendar_TimeGridSlot = { key: string; time: Temporal.PlainTime };

export type Calendar_TimeGridLayout<TData, TResourceData> = {
  kind: 'timeGrid';
  slots: Calendar_TimeGridSlot[];
  columns: Calendar_TimeGridColumn<TData, TResourceData>[];
  allDay?: { segments: Calendar_BarSegment<TData>[]; rows: number };
  minColumnWidth?: string;
};

export type Calendar_ListDay<TData> = { key: string; date: Temporal.PlainDate; events: Calendar_Event<TData>[] };

export type Calendar_ListLayout<TData> = { kind: 'list'; days: Calendar_ListDay<TData>[] };

export type Calendar_Layout<TData, TResourceData> =
  | Calendar_MonthLayout<TData>
  | Calendar_TimeGridLayout<TData, TResourceData>
  | Calendar_ListLayout<TData>;

export type Calendar_State<TData, TResourceData, TViews extends Calendar_Views> = {
  context: Calendar_ViewContext<TViews>;
  layout: Calendar_Layout<TData, TResourceData>;
  now: Temporal.ZonedDateTime;
};

export type Calendar_NavigateTarget<TViews extends Calendar_Views> = {
  view?: keyof TViews & string;
  date?: Temporal.PlainDate;
};

/** Actions only emit `onNavigate`; they never write state (D5). */
export type Calendar_Api<TViews extends Calendar_Views> = {
  next: () => void;
  prev: () => void;
  today: () => void;
  goTo: (date: Temporal.PlainDate) => void;
  setView: (view: keyof TViews & string, date?: Temporal.PlainDate) => void;
  navigate: (target: Calendar_NavigateTarget<TViews>) => void;
};

export type Calendar_Instance<TData, TResourceData, TViews extends Calendar_Views> = {
  readonly options: Calendar_Options<TData, TResourceData, TViews>;
  store: ReadonlyStore<Calendar_State<TData, TResourceData, TViews>>;
  api: Calendar_Api<TViews>;
  /** Adapter lifecycle: starts the clock and returns its cleanup. */
  '~mount': () => () => void;
  /** Adapter sync: call with every render's options; writes only when a tracked input changed. */
  '~update': (options: Calendar_Options<TData, TResourceData, TViews>) => void;
};
