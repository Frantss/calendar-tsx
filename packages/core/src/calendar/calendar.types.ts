import type { Temporal } from 'temporal-polyfill';
import type { Calendar_FirstDayOfWeek, Calendar_Range } from '#dates/date.types';
import type { Calendar_Views } from '#views/view.types';
import type { Calendar_EventDefinition, Calendar_Event } from '#events/event.types';
import type {
  Calendar_FeatureState,
  Calendar_Atom,
  Calendar_PickFeatures,
  Calendar_Features,
  Calendar_ConfiguredFeatures,
  Calendar_FeatureTypes,
} from '#features/feature.types';
import type { Calendar_Layout } from '#layouts/layout.types';

import type { Calendar_Api_FeatureMap, Calendar_Options_FeatureMap } from '#features/feature-maps.types';
import type { ReadonlyStore } from '@tanstack/store';

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

export type Calendar_NavigationOptions = { firstDayOfWeek: Calendar_FirstDayOfWeek };

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
} & Calendar_PickFeatures<Calendar_Options_FeatureMap<TData, TResourceData>, Calendar_FeatureTypes<TFeatures>>;

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
export type Calendar_Api<
  TViews extends Calendar_Views,
  TFeatures extends Calendar_Features = Calendar_Features,
  TData = unknown,
  TResourceData = unknown,
> = {
  next: () => void;
  prev: () => void;
  today: () => void;
  goTo: (date: Temporal.PlainDate) => void;
  setView: (view: keyof TViews & string, date?: Temporal.PlainDate) => void;
  navigate: (target: Calendar_NavigateTarget<TViews>) => void;
} & Calendar_PickFeatures<Calendar_Api_FeatureMap<TData, TResourceData>, Calendar_FeatureTypes<TFeatures>>;

export type Calendar_Instance<
  TData,
  TResourceData,
  TViews extends Calendar_Views,
  TFeatures extends Calendar_Features = Calendar_Features,
> = {
  readonly options: Calendar_Options<TData, TResourceData, TViews, TFeatures>;
  store: ReadonlyStore<Calendar_State<TData, TResourceData, TViews, TFeatures>>;
  api: Calendar_Api<TViews, TFeatures, TData, TResourceData>;
  /** Adapter lifecycle: starts the clock and returns its cleanup. */
  '~mount': () => () => void;
  /** Adapter sync: call with every render's options; writes only when a tracked input changed. */
  '~update': (options: Calendar_Options<TData, TResourceData, TViews, TFeatures>) => void;
};

/** The state type of an instance, for annotating selectors: `(state: Calendar_StateOf<typeof calendar>) => …`. */
export type Calendar_StateOf<TInstance> = TInstance extends { store: ReadonlyStore<infer TState> } ? TState : never;
