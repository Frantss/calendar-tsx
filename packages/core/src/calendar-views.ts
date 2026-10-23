import { calendarLayout_list, calendarLayout_month, calendarLayout_timeGrid } from '#calendar-layouts';
import type {
  Calendar_Features,
  Calendar_FeaturesOf,
  Calendar_LayoutKey,
  Calendar_ListViewSettings,
  Calendar_MonthViewSettings,
  Calendar_PickFeatures,
  Calendar_TimeGridViewSettings,
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

// `NoInfer` keeps views nested in `calendarViews_create` from inferring their features from its constraint, which
// would leak a string index into `keyof views.features` (D29).

export const calendarView_month = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_MonthViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('month', 'calendarLayout_month', calendarLayout_month, settings) as unknown as ViewOf<
    'calendarLayout_month',
    'month',
    Calendar_MonthViewSettings,
    TFeatures,
    typeof calendarLayout_month
  >;

export const calendarView_timeGrid = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_TimeGridViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('timeGrid', 'calendarLayout_timeGrid', calendarLayout_timeGrid, settings) as unknown as ViewOf<
    'calendarLayout_timeGrid',
    'timeGrid',
    Calendar_TimeGridViewSettings,
    TFeatures,
    typeof calendarLayout_timeGrid
  >;

export const calendarView_list = <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_ListViewSettings & Calendar_ViewFeatureSettings<TFeatures>,
) =>
  view_create('list', 'calendarLayout_list', calendarLayout_list, settings) as unknown as ViewOf<
    'calendarLayout_list',
    'list',
    Calendar_ListViewSettings,
    TFeatures,
    typeof calendarLayout_list
  >;

/** The views, plus every feature they use, to spread into the calendar's `features` (D29). */
export const calendarViews_create = <
  const TViews extends Record<string, { kind: string; '~layout': Calendar_LayoutKey; '~features': object }>,
>(
  views: TViews,
) => ({
  views,
  features: Object.assign({}, ...Object.values(views).map(view => view['~features'])) as Calendar_FeaturesOf<TViews>,
});
