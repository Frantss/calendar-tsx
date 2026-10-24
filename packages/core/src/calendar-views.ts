import { dayGridLayout, listLayout, timeGridLayout, timelineLayout } from '#calendar-layouts';
import { calendarPeriods_groups, calendarPeriods_validate } from '#calendar-periods';
import type {
  Calendar_DayGridViewSettings,
  Calendar_DurationSettings,
  Calendar_VisibilitySettings,
  Calendar_Features,
  Calendar_FeaturesOf,
  Calendar_LayoutKey,
  Calendar_ListViewSettings,
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
  { features, ...settings }: Calendar_DurationSettings & Calendar_VisibilitySettings & { features?: Calendar_Features },
) => {
  calendarPeriods_validate(settings);
  const grid = settings as Calendar_DayGridViewSettings;
  const groups = calendarPeriods_groups(grid.groupBy);
  const groupKeys = kind === 'list' ? ['date', 'resource'] : ['month', 'resource'];
  if (groups.length !== new Set(groups).size || groups.some(group => !groupKeys.includes(group)))
    throw new Error(`[calendar] groupBy must contain distinct ${groupKeys.join(' or ')} keys`);
  if (groups.includes('month') && (kind !== 'dayGrid' || settings.days !== undefined || settings.weeks !== undefined))
    throw new Error('[calendar] month grouping requires a day grid with a calendar-month duration');
  if (grid.fixedWeekCount !== undefined && settings.period !== 'month' && !groups.includes('month'))
    throw new Error('[calendar] fixedWeekCount requires individual month grids');
  const slotMinutes = (settings as { slotMinutes?: number }).slotMinutes;
  if (slotMinutes !== undefined && (!Number.isInteger(slotMinutes) || slotMinutes < 1))
    throw new Error('[calendar] slotMinutes must be a positive integer');
  return { ...settings, kind, '~layout': layoutKey, '~features': { ...features, [layoutKey]: layout } };
};

// `NoInfer` keeps views nested in `createCalendarViews` from inferring their features from its constraint, which
// would leak a string index into `keyof views.features` (D29).

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
