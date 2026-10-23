import { dayGridLayout, listLayout, monthLayout, timeGridLayout, timelineLayout } from '#calendar-layouts';
import type {
  Calendar_DayGridViewSettings,
  Calendar_Features,
  Calendar_FeaturesOf,
  Calendar_LayoutKey,
  Calendar_ListViewSettings,
  Calendar_MonthViewSettings,
  Calendar_PickFeatures,
  Calendar_TimeGridViewSettings,
  Calendar_TimelineViewSettings,
  Calendar_View,
  Calendar_ViewFeatureSettings,
  Calendar_ViewSettings_FeatureMap,
} from '#calendar.types';

type ViewOf<
  TLayout extends Calendar_LayoutKey,
  TKind extends string,
  TSettings,
  TFeatures extends Calendar_Features,
  TLayoutFeature,
> = TSettings &
  Calendar_PickFeatures<Calendar_ViewSettings_FeatureMap, TFeatures> &
  Calendar_View<TLayout, TKind, NoInfer<TFeatures> & { [K in TLayout]: TLayoutFeature }>;

const view_create = (
  kind: string,
  layoutKey: Calendar_LayoutKey,
  layout: unknown,
  { features, ...settings }: { features?: Calendar_Features },
) => ({ ...settings, kind, '~layout': layoutKey, '~features': { ...features, [layoutKey]: layout } });

// `NoInfer` keeps views nested in `createCalendarViews` from inferring their features from its constraint, which
// would leak a string index into `keyof views.features` (D29).

export const monthView = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_MonthViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('month', 'monthLayout', monthLayout, settings) as unknown as ViewOf<
    'monthLayout',
    'month',
    Calendar_MonthViewSettings,
    TFeatures,
    typeof monthLayout
  >;

/** A day grid of whole weeks; it builds the month model, so the month parts render it (D35). */
export const dayGridView = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_DayGridViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('dayGrid', 'dayGridLayout', dayGridLayout, settings) as unknown as ViewOf<
    'dayGridLayout',
    'dayGrid',
    Calendar_DayGridViewSettings,
    TFeatures,
    typeof dayGridLayout
  >;

export const timeGridView = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_TimeGridViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('timeGrid', 'timeGridLayout', timeGridLayout, settings) as unknown as ViewOf<
    'timeGridLayout',
    'timeGrid',
    Calendar_TimeGridViewSettings,
    TFeatures,
    typeof timeGridLayout
  >;

export const listView = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_ListViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('list', 'listLayout', listLayout, settings) as unknown as ViewOf<
    'listLayout',
    'list',
    Calendar_ListViewSettings,
    TFeatures,
    typeof listLayout
  >;

export const timelineView = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_TimelineViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('timeline', 'timelineLayout', timelineLayout, settings) as unknown as ViewOf<
    'timelineLayout',
    'timeline',
    Calendar_TimelineViewSettings,
    TFeatures,
    typeof timelineLayout
  >;

/** The views, plus every feature they use, to spread into the calendar's `features` (D29). */
export const createCalendarViews = <
  const TViews extends Record<string, { kind: string; '~layout': Calendar_LayoutKey; '~features': object }>,
>(
  views: TViews,
) => ({
  views,
  features: Object.assign({}, ...Object.values(views).map(view => view['~features'])) as Calendar_FeaturesOf<TViews>,
});
