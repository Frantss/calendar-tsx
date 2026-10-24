import { calendarFeatures_validate, calendarFeatures_config } from '#features/calendar-features';
import type {
  Calendar_Views,
  Calendar_BoundViews,
  Calendar_ValidateOverrides,
  Calendar_DurationSettings,
  Calendar_VisibilitySettings,
  Calendar_View,
  Calendar_ViewFeatureSettings,
} from '#views/view.types';
import type { Calendar_ConfiguredFeatures } from '#features/feature.types';
import { dayGridLayout, listLayout, timeGridLayout, timelineLayout } from '#layouts/layout-features';
import { calendarPeriods_groups, calendarPeriods_validate } from '#views/periods';
import type { Calendar_DayGridViewSettings } from '#layouts/day-grid/day-grid.types';

import type { Calendar_LayoutKey } from '#layouts/layout.types';
import type { Calendar_ListViewSettings } from '#layouts/list/list.types';
import type { Calendar_TimeGridViewSettings } from '#layouts/time-grid/time-grid.types';
import type { Calendar_TimelineViewSettings } from '#layouts/timeline/timeline.types';

type ViewOf<
  TLayout extends Calendar_LayoutKey,
  TKind extends string,
  TSettings,
  TOverrides extends object,
  TLayoutFeature,
> = TSettings & { features: TOverrides } & Calendar_View<TLayout, TKind, { [K in TLayout]: TLayoutFeature }>;

const view_create = (
  kind: string,
  layoutKey: Calendar_LayoutKey,
  layout: unknown,
  { features, ...settings }: Calendar_DurationSettings & Calendar_VisibilitySettings & { features?: object },
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
  return { ...settings, features: features ?? {}, kind, '~layout': layoutKey, '~features': { [layoutKey]: layout } };
};

export const dayGridView = <const TOverrides extends object = {}>(
  settings: Calendar_DayGridViewSettings & Calendar_ViewFeatureSettings<TOverrides>,
) =>
  view_create('dayGrid', 'dayGridLayout', dayGridLayout, settings) as unknown as ViewOf<
    'dayGridLayout',
    'dayGrid',
    Calendar_DayGridViewSettings,
    TOverrides,
    typeof dayGridLayout
  >;

export const timeGridView = <const TOverrides extends object = {}>(
  settings: Calendar_TimeGridViewSettings & Calendar_ViewFeatureSettings<TOverrides>,
) =>
  view_create('timeGrid', 'timeGridLayout', timeGridLayout, settings) as unknown as ViewOf<
    'timeGridLayout',
    'timeGrid',
    Calendar_TimeGridViewSettings,
    TOverrides,
    typeof timeGridLayout
  >;

export const listView = <const TOverrides extends object = {}>(
  settings: Calendar_ListViewSettings & Calendar_ViewFeatureSettings<TOverrides>,
) =>
  view_create('list', 'listLayout', listLayout, settings) as unknown as ViewOf<
    'listLayout',
    'list',
    Calendar_ListViewSettings,
    TOverrides,
    typeof listLayout
  >;

export const timelineView = <const TOverrides extends object = {}>(
  settings: Calendar_TimelineViewSettings & Calendar_ViewFeatureSettings<TOverrides>,
) =>
  view_create('timeline', 'timelineLayout', timelineLayout, settings) as unknown as ViewOf<
    'timelineLayout',
    'timeline',
    Calendar_TimelineViewSettings,
    TOverrides,
    typeof timelineLayout
  >;

/** Binds feature defaults and typed overrides to each named view (D54). */
export const calendarViews = <
  const TFeatures extends Calendar_ConfiguredFeatures,
  const TViews extends Calendar_Views,
>({
  features,
  views,
}: {
  features: TFeatures;
  views: TViews & Calendar_ValidateOverrides<NoInfer<TFeatures>, TViews>;
}): Calendar_BoundViews<TFeatures, TViews> => {
  calendarFeatures_validate(features);
  return Object.fromEntries(
    Object.entries(views).map(([key, view]) => {
      const overrides = (view as { features?: Record<string, unknown> }).features ?? {};
      for (const alias of Object.keys(overrides)) {
        if (!Object.hasOwn(features, alias))
          throw new Error(`[calendar] unknown feature override "${alias}" in view "${key}"`);
        calendarFeatures_config(features[alias]!, overrides[alias]);
      }
      if (Object.hasOwn(features, view['~layout']))
        throw new Error(`[calendar] feature key "${view['~layout']}" conflicts with a layout`);
      return [
        key,
        {
          ...view,
          '~features': {
            [view['~layout']]: (view['~features'] as Record<string, unknown>)[view['~layout']],
            ...features,
          },
        },
      ];
    }),
  ) as unknown as Calendar_BoundViews<TFeatures, TViews>;
};
