import type { DayOfWeek } from '#calendar-day-of-week';
export type * from '#features/background/background.types';
export type * from '#features/recurrence/recurrence.types';
import type {
  Calendar_EventInput_FeatureMap,
  Calendar_State_FeatureMap,
  Calendar_Api_FeatureMap,
  Calendar_DayGridDay_FeatureMap,
  Calendar_BarSegment_FeatureMap,
  Calendar_TimeGridColumn_FeatureMap,
  Calendar_TimeGridSegment_FeatureMap,
  Calendar_ListDay_FeatureMap,
  Calendar_TimelineRow_FeatureMap,
  Calendar_TimelineSegment_FeatureMap,
  Calendar_Layout_FeatureMap,
} from '#features/feature-maps.types';
export type * from '#features/feature-maps.types';
import type {
  Calendar_Features,
  Calendar_FeatureTypes,
  Calendar_ConfiguredFeatures,
  Calendar_FeatureOverride,
} from '#features/feature.types';
export type * from '#features/feature.types';
import type { ReadonlyStore } from '@tanstack/store';
import type { Temporal } from 'temporal-polyfill';
import type {
  LayoutCoordinates_DateAxis,
  LayoutCoordinates_Fragment,
  LayoutCoordinates_Plan,
} from '#layout/layout-coordinates';

/** `'background'` shades the range under the other events instead of laying it out as one (D37). */
export type Calendar_EventDisplay = 'auto' | 'background';

export type Calendar_TimedEventInput<TData> = {
  id: string;
  kind: 'timed';
  '~source'?: never;
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  resourceIds?: string[];
  /** Defaults to `'auto'`. */
  display?: Calendar_EventDisplay;
  data: TData;
};

export type Calendar_AllDayEventInput<TData> = {
  id: string;
  kind: 'allDay';
  '~source'?: never;
  start: Temporal.PlainDate;
  /** Inclusive; defaults to `start`. */
  end?: Temporal.PlainDate;
  resourceIds?: string[];
  /** Defaults to `'auto'`. */
  display?: Calendar_EventDisplay;
  data: TData;
};

/** Discriminated by `kind`. */
export type Calendar_EventInput<TData> = Calendar_TimedEventInput<TData> | Calendar_AllDayEventInput<TData>;

/** A definition resolved by the feature registered under `~source` (D50). */
export type Calendar_EventSource<TData> = { id: string; data: TData; '~source': string };

/** One-off inputs plus definitions supported by the registered features. */
export type Calendar_EventDefinition<TData, TFeatures = Calendar_Features> =
  | Calendar_EventInput<TData>
  | (Calendar_EventSource<TData> &
      Calendar_EventInput_FeatureMap<TData>[string extends keyof TFeatures
        ? keyof Calendar_EventInput_FeatureMap<TData>
        : Extract<keyof Calendar_FeatureTypes<TFeatures>, keyof Calendar_EventInput_FeatureMap<TData>>]);

/** An event after resolution and normalization; timed dates use the calendar's `timeZone`. */
export type Calendar_Event<TData> = Calendar_EventInput<TData> & {
  occurrence?: { seriesId: string; originalStart: Temporal.ZonedDateTime | Temporal.PlainDate };
};

/** Resolution is calendar-wide and memoized by definitions, input range and display zone (D50). */
export type Calendar_EventSourceContext = {
  /** Inclusive input coverage, including the following date needed by an overnight view. */
  range: Calendar_Range;
  timeZone: string;
};

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

export type Calendar_Range = { start: Temporal.PlainDate; end: Temporal.PlainDate };

/** ISO day of the week: 1 is Monday, 7 is Sunday. */
export type Calendar_DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export type Calendar_FirstDayOfWeek = Calendar_DayOfWeek;

type UnionToIntersection<U> = (U extends unknown ? (union: U) => void : never) extends (intersection: infer I) => void
  ? I
  : never;

/**
 * The contributions of the registered features to a feature map (D29). Wide feature types (the defaults) pick every
 * entry, so code that does not name its features sees everything a feature could add.
 */
export type Calendar_PickFeatures<TMap, TFeatures> = string extends keyof TFeatures
  ? UnionToIntersection<TMap[keyof TMap]> extends infer TAll
    ? [TAll] extends [never]
      ? {}
      : TAll
    : never
  : UnionToIntersection<TMap[Extract<keyof TFeatures, keyof TMap>]> extends infer TPicked
    ? [TPicked] extends [never]
      ? {}
      : TPicked
    : never;

export type Calendar_DateViewSettings = { hiddenDays?: readonly Calendar_DayOfWeek[] };
export type Calendar_TimeViewSettings = Calendar_DateViewSettings & {
  timeWindow?: { startMinutes: number; endMinutes: number };
};

export type Calendar_DayDuration =
  | { days: number; weeks?: never; months?: never; period?: never }
  | { weeks: number; days?: never; months?: never; period?: never };

export type Calendar_MonthDuration =
  | { months: number; days?: never; weeks?: never; period?: never }
  | { period: 'month' | 'quarter' | 'year'; days?: never; weeks?: never; months?: never };

export type Calendar_DurationSettings = Calendar_DayDuration | Calendar_MonthDuration;
export type Calendar_VisibilitySettings = Calendar_DateViewSettings;
export type Calendar_ResourceGrouping = 'resource' | readonly ['resource'];
export type Calendar_MonthGrouping =
  | 'month'
  | readonly ['month']
  | readonly ['month', 'resource']
  | readonly ['resource', 'month'];
export type Calendar_DayGridGrouping = Calendar_ResourceGrouping | Calendar_MonthGrouping;
export type Calendar_ListGrouping =
  | Calendar_ResourceGrouping
  | 'date'
  | readonly ['date']
  | readonly ['resource', 'date']
  | readonly ['date', 'resource'];

type MonthPeriod = { period: 'month'; days?: never; weeks?: never; months?: never };

export type Calendar_DayGridViewSettings = {
  maxEventsPerDay: number;
  dayOverflow?: (date: Temporal.PlainDate, resourceId?: string) => boolean;
  groupOrder?: 'resource-first' | 'date-first';
} & Calendar_VisibilitySettings &
  (
    | (Calendar_DayDuration & { groupBy?: Calendar_ResourceGrouping; fixedWeekCount?: never })
    | (MonthPeriod & { groupBy?: Calendar_DayGridGrouping; fixedWeekCount?: boolean })
    | (Calendar_MonthDuration & { groupBy: Calendar_MonthGrouping; fixedWeekCount?: boolean })
    | (Calendar_MonthDuration & { groupBy?: Calendar_ResourceGrouping; fixedWeekCount?: never })
  );

/** How overlapping timed events share a column (D38). */
export type Calendar_TimeGridOverlap = 'side-by-side' | 'cascade';

export type Calendar_TimeGridViewSettings = Calendar_DurationSettings &
  Calendar_TimeViewSettings & {
    groupBy?: Calendar_ResourceGrouping;
    groupOrder?: 'resource-first' | 'date-first';
    allDay?: boolean;
    slotMinutes?: number;
    minColumnWidth?: string;
    /** Defaults to `'side-by-side'`; `'cascade'` lets later lanes cover up to half of an event (D38). */
    overlap?: Calendar_TimeGridOverlap;
    /** Shorter timed events are laid out this long, on screen and for lanes; defaults to half of `slotMinutes`, `0` turns it off (D39). */
    minEventMinutes?: number;
    /** Segments laid out shorter than this are flagged `isShort`; defaults to 30 (D39). */
    shortEventMinutes?: number;
  };

export type Calendar_ListViewSettings = Calendar_DurationSettings &
  Calendar_VisibilitySettings & { groupBy?: Calendar_ListGrouping };

export type Calendar_TimelineViewSettings = Calendar_DurationSettings &
  Calendar_TimeViewSettings & {
    groupBy?: Calendar_ResourceGrouping;
    slotMinutes?: number;
    minSlotWidth?: string;
    /** Minimum display duration, also used for stacking; defaults to half of `slotMinutes`, `0` turns it off. */
    minEventMinutes?: number;
  };

export type Calendar_DayGridColumn<TResourceData = unknown> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
};

export type Calendar_DayGridDay<
  TData,
  TResourceData = unknown,
  TFeatures = {},
> = Calendar_DayGridColumn<TResourceData> & {
  isOutside: boolean;
  isToday: boolean;
  isUnavailable: boolean;
  /** Hidden rows crossing this day; not the true total when the input was truncated. */
  hiddenCount: number;
  hasMore: boolean;
  events: Calendar_Event<TData>[];
} & Calendar_PickFeatures<Calendar_DayGridDay_FeatureMap, TFeatures>;

export type Calendar_BarSegment<TData, TFeatures = {}> = {
  key: string;
  event: Calendar_Event<TData>;
  colStart: number;
  colSpan: number;
  row: number;
  isAllDay: boolean;
  /** The event covers more than one date, before clipping to the columns. */
  isMultiDay: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
} & Calendar_PickFeatures<Calendar_BarSegment_FeatureMap, TFeatures>;

/** A background event clipped to a run of day columns. It takes no row and sits under the bars (D37). */
export type Calendar_BackgroundEventSpan<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  colStart: number;
  colSpan: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_DayGridRow<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  days: Calendar_DayGridDay<TData, TResourceData, TFeatures>[];
  columnCount: number;
  segments: Calendar_BarSegment<TData, TFeatures>[];
  /** All-day background events only; timed ones shade time-grid columns (D37). */
  backgroundEvents: Calendar_BackgroundEventSpan<TData>[];
  stackCount: number;
};

export type Calendar_DayGridSection<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  period: Calendar_Range;
  range: Calendar_Range;
  month?: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  columns: Calendar_DayGridColumn<TResourceData>[];
  columnCount: number;
  rows: Calendar_DayGridRow<TData, TResourceData, TFeatures>[];
};

export type Calendar_DayGridLayout<TData, TResourceData = unknown, TFeatures = {}> = {
  kind: 'dayGrid';
  coordinates: LayoutCoordinates_DateAxis;
  sections: Calendar_DayGridSection<TData, TResourceData, TFeatures>[];
};

export type Calendar_TimeGridSegment<TData, TFeatures = {}> = {
  key: string;
  event: Calendar_Event<TData>;
  /** Exact source coverage before D40 enclosure and minimum paint sizing. */
  fragments: readonly LayoutCoordinates_Fragment[];
  /** Fractions of the column's visible clock window. */
  start: number;
  span: number;
  lane: number;
  lanes: number;
  /** Fractions of the column's width, after expansion into free lanes and any cascade (D38). */
  inlineStart: number;
  inlineSize: number;
  /** Laid out shorter than the view's `shortEventMinutes`, so one line of content fits (D39). */
  isShort: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
} & Calendar_PickFeatures<Calendar_TimeGridSegment_FeatureMap, TFeatures>;

export type Calendar_UnavailableSegment = { key: string; start: number; span: number };

/** Background-event coverage, as fractions of a time-grid column or timeline track (D37, D42). */
export type Calendar_BackgroundEventSegment<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  start: number;
  span: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_TimeGridColumn<TData, TResourceData, TFeatures = {}> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  isToday: boolean;
  isUnavailable: boolean;
  /** The most lanes any overlap cluster in the column uses; 0 without timed events. */
  lanes: number;
  segments: Calendar_TimeGridSegment<TData, TFeatures>[];
  /** Timed background events, plus all-day ones covering the whole day (D37). */
  backgroundEvents: Calendar_BackgroundEventSegment<TData>[];
  unavailable: Calendar_UnavailableSegment[];
  now?: number;
} & Calendar_PickFeatures<Calendar_TimeGridColumn_FeatureMap, TFeatures>;

export type Calendar_TimeGridSlot = {
  key: string;
  time: Temporal.PlainTime;
  dayOffset: number;
  start: number;
  span: number;
};

export type Calendar_TimeGridLayout<TData, TResourceData, TFeatures = {}> = {
  kind: 'timeGrid';
  coordinates: LayoutCoordinates_Plan;
  /** Visible duration divided by slotMinutes; may include a final partial slot. */
  slotUnits: number;
  /** The length of each slot. */
  slotMinutes: number;
  /** Slot units from the start of the visible window to its first hour; 0 when it starts on the hour. */
  hourOffset: number;
  slots: Calendar_TimeGridSlot[];
  columns: Calendar_TimeGridColumn<TData, TResourceData, TFeatures>[];
  allDay?: {
    segments: Calendar_BarSegment<TData, TFeatures>[];
    backgroundEvents: Calendar_BackgroundEventSpan<TData>[];
    rows: number;
  };
  minColumnWidth?: string;
};

export type Calendar_ListDay<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  events: Calendar_Event<TData>[];
} & Calendar_PickFeatures<Calendar_ListDay_FeatureMap, TFeatures>;

export type Calendar_ListSection<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  date?: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  days: Calendar_ListDay<TData, TResourceData, TFeatures>[];
};

export type Calendar_ListLayout<TData, TResourceData = unknown, TFeatures = {}> = {
  kind: 'list';
  coordinates: LayoutCoordinates_DateAxis;
  sections: Calendar_ListSection<TData, TResourceData, TFeatures>[];
  /** The sections' days in render order, sharing the same objects. */
  days: Calendar_ListDay<TData, TResourceData, TFeatures>[];
};

/** A day in the timeline header, as slot columns. */
export type Calendar_TimelineDay = {
  key: string;
  date: Temporal.PlainDate;
  isToday: boolean;
  colStart: number;
  colSpan: number;
  start: number;
  span: number;
};

export type Calendar_TimelineSlot = {
  key: string;
  date: Temporal.PlainDate;
  time: Temporal.PlainTime;
  col: number;
  dayOffset: number;
  start: number;
  span: number;
};

export type Calendar_TimelineSegment<TData, TFeatures = {}> = {
  key: string;
  event: Calendar_Event<TData>;
  /** Empty for all-day events, which follow anchor dates rather than source instants. */
  fragments: readonly LayoutCoordinates_Fragment[];
  /** Fractions of the range. */
  start: number;
  span: number;
  /** Stack row within its timeline row. */
  row: number;
  isAllDay: boolean;
  /** The event covers more than one date, before clipping to the range. */
  isMultiDay: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
} & Calendar_PickFeatures<Calendar_TimelineSegment_FeatureMap, TFeatures>;

export type Calendar_TimelineRow<TData, TResourceData, TFeatures = {}> = {
  key: string;
  resource?: Calendar_Resource<TResourceData>;
  isUnavailable: boolean;
  segments: Calendar_TimelineSegment<TData, TFeatures>[];
  backgroundEvents: Calendar_BackgroundEventSegment<TData>[];
  /** Stack depth. */
  rows: number;
  /** Fractions of the range. */
  unavailable: Calendar_UnavailableSegment[];
} & Calendar_PickFeatures<Calendar_TimelineRow_FeatureMap, TFeatures>;

export type Calendar_TimelineLayout<TData, TResourceData, TFeatures = {}> = {
  kind: 'timeline';
  coordinates: LayoutCoordinates_Plan;
  slotUnits: number;
  /** The length of each slot. */
  slotMinutes: number;
  /** Slot units from the start of each day's visible window to its first hour; 0 when it starts on the hour. */
  hourOffset: number;
  days: Calendar_TimelineDay[];
  slots: Calendar_TimelineSlot[];
  rows: Calendar_TimelineRow<TData, TResourceData, TFeatures>[];
  /** The clock's fraction of the range; absent outside it. */
  now?: number;
  minSlotWidth?: string;
};

export type Calendar_LayoutKey = keyof Calendar_Layout_FeatureMap<unknown, unknown, {}>;

/** What a layout's `build` receives: the core pipeline's output for the active view. */
export type Calendar_LayoutInput<TData, TResourceData> = {
  firstDayOfWeek: Calendar_FirstDayOfWeek;
  range: Calendar_Range;
  period: Calendar_Range;
  inputRange: Calendar_Range;
  /** Normalised to `timeZone`, filtered to `inputRange`, sorted by `eventOrder`; no background events. */
  events: Calendar_Event<TData>[];
  /** The events with `display: 'background'`: normalised and clipped likewise, in input order (D37). */
  backgroundEvents: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
};

export type Calendar_NavigationOptions = { firstDayOfWeek: Calendar_FirstDayOfWeek };

/** A layout model as features see it; layout features know their own shape. */
export type Calendar_AnyLayout = { kind: string };

/** A view: its settings plus the layout and features it uses. Create views with the `*View` factories (`dayGridView`, …). */
export type Calendar_View<
  TLayout extends Calendar_LayoutKey = Calendar_LayoutKey,
  TKind extends string = string,
  TFeatures extends object = Calendar_Features,
> = {
  kind: TKind;
  '~layout': TLayout;
  '~features': TFeatures;
};

export type Calendar_Views = Record<string, Calendar_View>;

/** Unbound overrides are validated against a registry by `calendarViews`. */
export type Calendar_ViewFeatureSettings<TOverrides extends object> = {
  features?: TOverrides;
};

export type Calendar_ViewOverrides<TFeatures extends Calendar_ConfiguredFeatures> = {
  [K in keyof TFeatures]?: Calendar_FeatureOverride<TFeatures[K]>;
};

export type Calendar_BoundViews<TFeatures extends Calendar_ConfiguredFeatures, TViews extends Calendar_Views> = {
  [K in keyof TViews]: Omit<TViews[K], '~features'> & {
    '~features': Pick<TViews[K]['~features'], Extract<TViews[K]['~layout'], keyof TViews[K]['~features']>> & TFeatures;
  };
};

type ValidateOverrideValue<TAllowed, TValue> = TAllowed extends unknown
  ? TValue extends readonly unknown[]
    ? TAllowed
    : TValue extends object
      ? TAllowed & Record<Exclude<keyof TValue, keyof TAllowed>, never>
      : TAllowed
  : never;

export type Calendar_ValidateOverrides<TFeatures extends Calendar_ConfiguredFeatures, TViews extends Calendar_Views> = {
  [K in keyof TViews]: TViews[K] extends { features: infer TOverrides }
    ? {
        features: {
          [P in keyof TOverrides]: P extends keyof TFeatures
            ? ValidateOverrideValue<Calendar_FeatureOverride<TFeatures[P]>, TOverrides[P]>
            : never;
        };
      }
    : unknown;
};

export type Calendar_FeaturesOf<TViews extends Record<string, { '~features': object }>> = UnionToIntersection<
  TViews[keyof TViews]['~features']
>;

type MissingFeatures<TViews extends Calendar_Views, TFeatures> =
  | Exclude<keyof Calendar_FeaturesOf<TViews>, keyof TFeatures | TViews[keyof TViews]['~layout']>
  | {
      [K in keyof Calendar_FeaturesOf<TViews> & keyof TFeatures]: TFeatures[K] extends Calendar_FeaturesOf<TViews>[K]
        ? never
        : K;
    }[keyof Calendar_FeaturesOf<TViews> & keyof TFeatures];

/** Every feature the views use must be in `features`, with a compatible implementation. Wide views are not checked. */
export type Calendar_ValidateFeatures<
  TViews extends Calendar_Views,
  TFeatures,
> = string extends keyof Calendar_FeaturesOf<TViews>
  ? unknown
  : [MissingFeatures<TViews, TFeatures>] extends [never]
    ? unknown
    : {
        features: `Error: views use '${MissingFeatures<TViews, TFeatures> & string}'; pass the registry used by calendarViews`;
      };

type NavigationFor<TViewKey extends string> = {
  view: TViewKey;
  date: Temporal.PlainDate;
  /** Anchor-date envelope, including month padding and hidden weekdays. */
  range: Calendar_Range;
  /** Coarse dates needed by the display windows; use this when fetching input events. */
  inputRange: Calendar_Range;
  /** Nominal day, week or month. */
  period: Calendar_Range;
};

export type Calendar_Navigation<TViews extends Calendar_Views> = TViews extends unknown
  ? NavigationFor<keyof TViews & string>
  : never;

export type Calendar_ViewContext<TViews extends Calendar_Views> = TViews extends unknown
  ? NavigationFor<keyof TViews & string> & {
      kind: TViews[keyof TViews]['kind'];
    }
  : never;

/** A store a feature slice can live in; TanStack Store's `Store` fits. */
export type Calendar_Atom<TValue> = {
  readonly state: TValue;
  setState: (updater: (previous: TValue) => TValue) => void;
};

export type Calendar_FeatureState<TFeatures> = Calendar_PickFeatures<
  Calendar_State_FeatureMap,
  Calendar_FeatureTypes<TFeatures>
>;

export type Calendar_Options<
  TData,
  TResourceData,
  TViews extends Calendar_Views,
  TFeatures extends Calendar_Features = Calendar_ConfiguredFeatures,
> = {
  timeZone: string;
  /** The map returned by `calendarViews`; tracked by reference. */
  views: TViews;
  /** Configured definitions returned by `calendarFeatures`. Read once at creation. */
  features: TFeatures;
  view: keyof NoInfer<TViews> & string;
  date: Temporal.PlainDate;
  onNavigate: (next: Calendar_Navigation<NoInfer<TViews>>) => void;
  /**
   * Ids must be unique; tracked by reference. Events with `display: 'background'` are shaded under the others: no
   * lanes or rows, no `eventOrder`, no feature `events` stages, not in `day.events` or the list (D37).
   */
  events: Calendar_EventDefinition<TData, NoInfer<TFeatures>>[];
  /** Tracked by reference. */
  resources?: Calendar_Resource<TResourceData>[];
  /** Read when the layout derives; changing it alone does not re-derive. */
  eventOrder?: (
    a: Calendar_Event<TData>,
    b: Calendar_Event<TData>,
    context: Calendar_ViewContext<NoInfer<TViews>>,
  ) => number;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
  clock?: Calendar_Clock;
  /**
   * "Now" for the first derivation, before `'~mount'` reads the clock. Pass the same instant on the server and the
   * client so server-rendered markup hydrates (D27). Read once at creation.
   */
  initialNow?: Temporal.Instant;
  /** Controlled feature state slices; each slice tracked by reference. */
  state?: Partial<Calendar_FeatureState<NoInfer<TFeatures>>>;
  /** External stores for feature state slices; read once at creation. */
  atoms?: {
    [K in keyof Calendar_FeatureState<NoInfer<TFeatures>>]?: Calendar_Atom<
      Calendar_FeatureState<NoInfer<TFeatures>>[K]
    >;
  };
};

/** One layout per view, with all registered features inherited (D54). */
export type Calendar_Layout<
  TData,
  TResourceData,
  TViews extends Calendar_Views = Calendar_Views,
  TFeatures extends Calendar_Features = {},
> = {
  [K in keyof TViews]: Calendar_Layout_FeatureMap<
    TData,
    TResourceData,
    Calendar_FeatureTypes<TViews[K]['~features'] & TFeatures>
  >[TViews[K]['~layout']];
}[keyof TViews];

export type Calendar_State<
  TData,
  TResourceData,
  TViews extends Calendar_Views,
  TFeatures extends Calendar_Features = Calendar_Features,
> = {
  context: Calendar_ViewContext<TViews>;
  layout: Calendar_Layout<TData, TResourceData, TViews, TFeatures>;
  now: Temporal.ZonedDateTime;
} & Calendar_FeatureState<TFeatures>;

export type Calendar_NavigateTarget<TViews extends Calendar_Views> = {
  view?: keyof TViews & string;
  date?: Temporal.PlainDate;
};

/** Actions only emit `onNavigate`; they never write state (D5). */
export type Calendar_Api<TViews extends Calendar_Views, TFeatures extends Calendar_Features = Calendar_Features> = {
  next: () => void;
  prev: () => void;
  today: () => void;
  goTo: (date: Temporal.PlainDate) => void;
  setView: (view: keyof TViews & string, date?: Temporal.PlainDate) => void;
  navigate: (target: Calendar_NavigateTarget<TViews>) => void;
} & Calendar_PickFeatures<Calendar_Api_FeatureMap, Calendar_FeatureTypes<TFeatures>>;

export type Calendar_Instance<
  TData,
  TResourceData,
  TViews extends Calendar_Views,
  TFeatures extends Calendar_Features = Calendar_Features,
> = {
  readonly options: Calendar_Options<TData, TResourceData, TViews, TFeatures>;
  store: ReadonlyStore<Calendar_State<TData, TResourceData, TViews, TFeatures>>;
  api: Calendar_Api<TViews, TFeatures>;
  /** Adapter lifecycle: starts the clock and returns its cleanup. */
  '~mount': () => () => void;
  /** Adapter sync: call with every render's options; writes only when a tracked input changed. */
  '~update': (options: Calendar_Options<TData, TResourceData, TViews, TFeatures>) => void;
};

/** The state type of an instance, for annotating selectors: `(state: Calendar_StateOf<typeof calendar>) => …`. */
export type Calendar_StateOf<TInstance> = TInstance extends { store: ReadonlyStore<infer TState> } ? TState : never;
