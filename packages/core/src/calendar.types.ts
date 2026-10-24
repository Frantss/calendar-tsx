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

export type Calendar_Range = { start: Temporal.PlainDate; end: Temporal.PlainDate };

export type Calendar_FirstDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** ISO day of the week: 1 is Monday, 7 is Sunday. */
export type Calendar_DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A range a background layer shades (D33); all-day ranges cover whole days, `end` inclusive and defaulting to `start`. */
export type Calendar_BackgroundRange =
  | { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }
  | { allDay: true; start: Temporal.PlainDate; end?: Temporal.PlainDate };

/** One kind of shading (D33). Create layers with `createBackgroundLayer` to keep `kind` a literal. */
export type Calendar_BackgroundLayer<TKind extends string = string> = {
  id: string;
  /** Emitted as `data-kind`. */
  kind: TKind;
  /** Shade what the ranges leave uncovered. */
  inverse?: boolean;
  /** Limits the layer to these resources' columns; omitted, it shades every column. */
  resourceIds?: string[];
  /** A list, or a function of the input date envelope and `timeZone`; both are compared by reference. */
  ranges: Calendar_BackgroundRange[] | ((range: Calendar_Range, timeZone: string) => Calendar_BackgroundRange[]);
};

/** Opening hours on some days of the week, in the calendar's `timeZone`; an `endTime` at or before `startTime` ends the next day. */
export type Calendar_WeeklyRule = {
  daysOfWeek: Calendar_DayOfWeek[];
  startTime: Temporal.PlainTime;
  endTime: Temporal.PlainTime;
};

/** A shaded span in a time-grid column, as fractions of the column's visible clock window. */
export type Calendar_BackgroundSegment = { key: string; layer: string; kind: string; start: number; span: number };

/** A layer that shades a whole month day. */
export type Calendar_DayBackground = { key: string; layer: string; kind: string };

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

/*
 * Feature maps (D29). Features extend them by declaration merging, keyed by the feature's export name; each map is
 * filtered by the features a calendar or view registers.
 */

/** Calendar options a feature adds. */
// oxlint-disable-next-line no-unused-vars -- merges must repeat the generics
export interface Calendar_Options_FeatureMap<TData, TResourceData> {
  backgroundFeature: { backgrounds?: Calendar_BackgroundLayer[] };
}
/** Per-view settings a feature adds; a view accepts them only when it lists the feature. */
export interface Calendar_ViewSettings_FeatureMap {}
/** State slices a feature owns; each is uncontrolled, controlled through `state`, or external through `atoms`. */
export interface Calendar_State_FeatureMap {}
/** Actions a feature merges onto `api`. */
export interface Calendar_Api_FeatureMap {}
/** Model fields a feature adds to the layouts of the views that list it. */
export interface Calendar_MonthDay_FeatureMap {
  backgroundFeature: { backgrounds: Calendar_DayBackground[] };
}
export interface Calendar_BarSegment_FeatureMap {}
export interface Calendar_TimeGridColumn_FeatureMap {
  backgroundFeature: { backgrounds: Calendar_BackgroundSegment[] };
}
export interface Calendar_TimeGridSegment_FeatureMap {}
export interface Calendar_ListDay_FeatureMap {}
export interface Calendar_TimelineRow_FeatureMap {}
export interface Calendar_TimelineSegment_FeatureMap {}

export type Calendar_DateViewSettings = {
  /** Hidden ISO weekdays, Monday 1 through Sunday 7. Hiding all seven is invalid. */
  hiddenDays?: readonly Calendar_DayOfWeek[];
};

export type Calendar_TimeViewSettings = Calendar_DateViewSettings & {
  /** Nominal clock minutes; an end beyond 1440 belongs to the anchor date's following morning. */
  timeWindow?: { startMinutes: number; endMinutes: number };
};

export type Calendar_MonthViewSettings = Calendar_DateViewSettings & {
  maxEventsPerDay: number;
  dayOverflow?: (date: Temporal.PlainDate) => boolean;
  /** Always show six weeks (D35). */
  fixedWeekCount?: boolean;
};

/** Whole weeks from the week containing the date; built as a month model (D35). */
export type Calendar_DayGridViewSettings = Calendar_DateViewSettings & {
  weeks: number;
  maxEventsPerDay: number;
  dayOverflow?: (date: Temporal.PlainDate) => boolean;
};

/** How overlapping timed events share a column (D38). */
export type Calendar_TimeGridOverlap = 'side-by-side' | 'cascade';

export type Calendar_TimeGridViewSettings = Calendar_TimeViewSettings & {
  days: number;
  groupBy?: 'resource';
  groupOrder?: 'resource-first' | 'date-first';
  allDay?: boolean;
  slotMinutes?: number;
  minColumnWidth?: string;
  /** Defaults to `'side-by-side'`; `'cascade'` lets later lanes cover up to half of an event (D38). */
  overlap?: Calendar_TimeGridOverlap;
  /** Shorter timed events are laid out this long, on screen and for lanes; defaults to 15, `0` turns it off (D39). */
  minEventMinutes?: number;
  /** Segments laid out shorter than this are flagged `isShort`; defaults to 30 (D39). */
  shortEventMinutes?: number;
};

/** A run of `days` days, or the calendar month or year containing the date (D36). */
export type Calendar_ListViewSettings = Calendar_DateViewSettings &
  ({ days: number; period?: never } | { period: 'month' | 'year'; days?: never });

export type Calendar_TimelineViewSettings = Calendar_TimeViewSettings & {
  days: number;
  groupBy?: 'resource';
  slotMinutes?: number;
  minSlotWidth?: string;
};

export type Calendar_MonthDay<TData, TFeatures = {}> = {
  key: string;
  date: Temporal.PlainDate;
  isOutside: boolean;
  isToday: boolean;
  /** Hidden rows crossing this day; not the true total when the input was truncated. */
  hiddenCount: number;
  hasMore: boolean;
  events: Calendar_Event<TData>[];
} & Calendar_PickFeatures<Calendar_MonthDay_FeatureMap, TFeatures>;

export type Calendar_BarSegment<TData, TFeatures = {}> = {
  key: string;
  event: Calendar_Event<TData>;
  colStart: number;
  colSpan: number;
  row: number;
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

export type Calendar_MonthWeek<TData, TFeatures = {}> = {
  key: string;
  days: Calendar_MonthDay<TData, TFeatures>[];
  segments: Calendar_BarSegment<TData, TFeatures>[];
  /** All-day background events only; timed ones shade time-grid columns (D37). */
  backgroundEvents: Calendar_BackgroundEventSpan<TData>[];
  rows: number;
};

export type Calendar_MonthLayout<TData, TFeatures = {}> = {
  kind: 'month';
  coordinates: LayoutCoordinates_DateAxis;
  weekdays: Temporal.PlainDate[];
  weeks: Calendar_MonthWeek<TData, TFeatures>[];
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

/** A background event clipped to one time-grid column, as fractions of the column's visible clock window (D37). */
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
  slots: Calendar_TimeGridSlot[];
  columns: Calendar_TimeGridColumn<TData, TResourceData, TFeatures>[];
  allDay?: {
    segments: Calendar_BarSegment<TData, TFeatures>[];
    backgroundEvents: Calendar_BackgroundEventSpan<TData>[];
    rows: number;
  };
  minColumnWidth?: string;
};

export type Calendar_ListDay<TData, TFeatures = {}> = {
  key: string;
  date: Temporal.PlainDate;
  events: Calendar_Event<TData>[];
} & Calendar_PickFeatures<Calendar_ListDay_FeatureMap, TFeatures>;

export type Calendar_ListLayout<TData, TFeatures = {}> = {
  kind: 'list';
  coordinates: LayoutCoordinates_DateAxis;
  days: Calendar_ListDay<TData, TFeatures>[];
};

/** A day in the timeline header, as slot columns. */
export type Calendar_TimelineDay = {
  key: string;
  date: Temporal.PlainDate;
  isToday: boolean;
  colStart: number;
  colSpan: number;
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
  continuesBefore: boolean;
  continuesAfter: boolean;
} & Calendar_PickFeatures<Calendar_TimelineSegment_FeatureMap, TFeatures>;

export type Calendar_TimelineRow<TData, TResourceData, TFeatures = {}> = {
  key: string;
  resource?: Calendar_Resource<TResourceData>;
  isUnavailable: boolean;
  segments: Calendar_TimelineSegment<TData, TFeatures>[];
  /** Stack depth. */
  rows: number;
  /** Fractions of the range. */
  unavailable: Calendar_UnavailableSegment[];
} & Calendar_PickFeatures<Calendar_TimelineRow_FeatureMap, TFeatures>;

export type Calendar_TimelineLayout<TData, TResourceData, TFeatures = {}> = {
  kind: 'timeline';
  coordinates: LayoutCoordinates_Plan;
  slotUnits: number;
  days: Calendar_TimelineDay[];
  slots: Calendar_TimelineSlot[];
  rows: Calendar_TimelineRow<TData, TResourceData, TFeatures>[];
  /** The clock's fraction of the range; absent outside it. */
  now?: number;
  minSlotWidth?: string;
};

/** Layout key → layout, given the features of the view it renders. Layout features extend it by declaration merging. */
export interface Calendar_Layout_FeatureMap<TData, TResourceData, TFeatures> {
  monthLayout: Calendar_MonthLayout<TData, TFeatures>;
  dayGridLayout: Calendar_MonthLayout<TData, TFeatures>;
  timeGridLayout: Calendar_TimeGridLayout<TData, TResourceData, TFeatures>;
  listLayout: Calendar_ListLayout<TData, TFeatures>;
  timelineLayout: Calendar_TimelineLayout<TData, TResourceData, TFeatures>;
}

export type Calendar_LayoutKey = keyof Calendar_Layout_FeatureMap<unknown, unknown, {}>;

/** What a layout's `build` receives: the core pipeline's output for the active view. */
export type Calendar_LayoutInput<TData, TResourceData> = {
  range: Calendar_Range;
  period: Calendar_Range;
  inputRange: Calendar_Range;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
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

/** What feature hooks receive. */
export type Calendar_FeatureContext = {
  readonly options: Calendar_Options<any, any, Calendar_Views, Calendar_Features>;
  /** The active view. */
  readonly view: Calendar_View & Record<string, unknown>;
  readonly api: Calendar_Api<Calendar_Views, Calendar_Features>;
  getState: <TValue = unknown>(key: string) => TValue;
  /** Writes an uncontrolled slice or an external atom; a controlled slice only changes when `state` changes. */
  setState: <TValue = unknown>(key: string, updater: (previous: TValue) => TValue) => void;
  /** Feature defaults, then the calendar option `key`, then the active view's `key`; shallow-merged per layer. */
  settings: <TSettings extends object>(key: string, defaults: TSettings) => TSettings;
};

/** A pipeline stage; it reruns when its input or one of its `deps` changes. */
export type Calendar_FeatureStage<TValue> = {
  deps?: (context: Calendar_FeatureContext) => unknown[];
  run: (value: TValue, context: Calendar_FeatureContext) => TValue;
};

/** A constant with no arguments; configuration lives in options and view settings (D29). */
export type Calendar_Feature = {
  getInitialState?: () => Record<string, unknown>;
  /** Option keys that re-derive the layout when their reference changes; other feature options are read untracked. */
  trackedOptions?: readonly string[];
  /** Actions merged onto `api`. */
  constructApi?: (context: Calendar_FeatureContext) => Record<string, unknown>;
  /** Runs after the core sort, in registration order, in the views that list the feature. */
  events?: Calendar_FeatureStage<Calendar_Event<unknown>[]>;
  /** Adds model fields to the built layout, in the views that list the feature. */
  decorate?: Calendar_FeatureStage<Calendar_AnyLayout>;
};

/** A feature that also supplies a view kind: navigation and the layout builder. */
export type Calendar_LayoutFeature<TKind extends string = string, TSettings = any> = Calendar_Feature & {
  kind: TKind;
  /** The nominal period around `date`. */
  period: (date: Temporal.PlainDate, settings: TSettings, options: Calendar_NavigationOptions) => Calendar_Range;
  /** The anchor-date envelope for `period`, padding included. */
  range: (period: Calendar_Range, settings: TSettings, options: Calendar_NavigationOptions) => Calendar_Range;
  /** Coarse input dates, including the following morning for overnight windows. Defaults to range. */
  inputRange?: (range: Calendar_Range, settings: TSettings) => Calendar_Range;
  /** The date one period before or after `date`. */
  step: (date: Temporal.PlainDate, settings: TSettings, direction: 1 | -1) => Temporal.PlainDate;
  build: (input: Calendar_LayoutInput<any, any>, settings: TSettings) => Calendar_AnyLayout;
};

export type Calendar_Features = Record<string, Calendar_Feature>;

/** A view: its settings plus the layout and features it uses. Create views with the `*View` factories (`monthView`, …). */
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

/** The settings a view factory takes beyond its layout's own: the features it uses and their per-view settings. */
export type Calendar_ViewFeatureSettings<TFeatures extends Calendar_Features> = {
  features?: TFeatures;
} & Calendar_PickFeatures<Calendar_ViewSettings_FeatureMap, TFeatures>;

export type Calendar_FeaturesOf<TViews extends Record<string, { '~features': object }>> = UnionToIntersection<
  TViews[keyof TViews]['~features']
>;

type MissingFeatures<TViews extends Calendar_Views, TFeatures> =
  | Exclude<keyof Calendar_FeaturesOf<TViews>, keyof TFeatures>
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
        features: `Error: views use '${MissingFeatures<TViews, TFeatures> & string}'; spread views.features into features, or replace them with compatible implementations`;
      };

export type Calendar_Navigation<TViews extends Calendar_Views> = {
  view: keyof TViews & string;
  date: Temporal.PlainDate;
  /** Anchor-date envelope, including month padding and hidden weekdays. */
  range: Calendar_Range;
  /** Coarse dates needed by the display windows; use this when fetching input events. */
  inputRange: Calendar_Range;
  /** Nominal day, week or month. */
  period: Calendar_Range;
};

export type Calendar_ViewContext<TViews extends Calendar_Views> = Calendar_Navigation<TViews> & {
  kind: TViews[keyof TViews]['kind'];
};

/** A store a feature slice can live in; TanStack Store's `Store` fits. */
export type Calendar_Atom<TValue> = {
  readonly state: TValue;
  setState: (updater: (previous: TValue) => TValue) => void;
};

export type Calendar_FeatureState<TFeatures> = Calendar_PickFeatures<Calendar_State_FeatureMap, TFeatures>;

export type Calendar_Options<
  TData,
  TResourceData,
  TViews extends Calendar_Views,
  TFeatures extends Calendar_Features = Calendar_Features,
> = {
  timeZone: string;
  locale?: string;
  /** Usually `createCalendarViews(…).views`; tracked by reference. */
  views: TViews;
  /** Usually `{ ...views.features }` plus calendar-wide features. Read once at creation. */
  features: TFeatures;
  view: keyof TViews & string;
  date: Temporal.PlainDate;
  onNavigate: (next: Calendar_Navigation<TViews>) => void;
  /**
   * Ids must be unique; tracked by reference. Events with `display: 'background'` are shaded under the others: no
   * lanes or rows, no `eventOrder`, no feature `events` stages, not in `day.events` or the list (D37).
   */
  events: Calendar_EventInput<TData>[];
  /** Tracked by reference. */
  resources?: Calendar_Resource<TResourceData>[];
  /** Read when the layout derives; changing it alone does not re-derive. */
  eventOrder?: (a: Calendar_Event<TData>, b: Calendar_Event<TData>, context: Calendar_ViewContext<TViews>) => number;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
  clock?: Calendar_Clock;
  /**
   * "Now" for the first derivation, before `'~mount'` reads the clock. Pass the same instant on the server and the
   * client so server-rendered markup hydrates (D27). Read once at creation.
   */
  initialNow?: Temporal.Instant;
  /** Controlled feature state slices; each slice tracked by reference. */
  state?: Partial<Calendar_FeatureState<TFeatures>>;
  /** External stores for feature state slices; read once at creation. */
  atoms?: { [K in keyof Calendar_FeatureState<TFeatures>]?: Calendar_Atom<Calendar_FeatureState<TFeatures>[K]> };
} & Calendar_PickFeatures<Calendar_Options_FeatureMap<TData, TResourceData>, TFeatures>;

/** One layout per view, each shaped by the features that view lists. */
export type Calendar_Layout<TData, TResourceData, TViews extends Calendar_Views = Calendar_Views> = {
  [K in keyof TViews]: Calendar_Layout_FeatureMap<TData, TResourceData, TViews[K]['~features']>[TViews[K]['~layout']];
}[keyof TViews];

export type Calendar_State<
  TData,
  TResourceData,
  TViews extends Calendar_Views,
  TFeatures extends Calendar_Features = Calendar_Features,
> = {
  context: Calendar_ViewContext<TViews>;
  layout: Calendar_Layout<TData, TResourceData, TViews>;
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
} & Calendar_PickFeatures<Calendar_Api_FeatureMap, TFeatures>;

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
