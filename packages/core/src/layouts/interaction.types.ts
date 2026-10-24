import type { DayGrid_LayoutInteractionMap } from '#layouts/day-grid/day-grid.types';
import type { TimeGrid_LayoutInteractionMap } from '#layouts/time-grid/time-grid.types';
import type { Timeline_LayoutInteractionMap } from '#layouts/timeline/timeline.types';
import type { Temporal } from 'temporal-polyfill';
import type { Calendar_AnyLayout, Calendar_LayoutInput } from '#layouts/layout.types';
import type { Calendar_LayoutFeature } from '#features/feature.types';

export type DatePoint = { fraction: number; dateKind?: 'timed' | 'allDay'; offset?: string; edge?: 'start' | 'end' };

/** Fractions along a surface's date/time axis; previews do not repack the base layout. */
export type Calendar_DatePreview = {
  surface: string;
  start: number;
  span: number;
  inlineStart?: number;
  inlineSize?: number;
};

export interface Calendar_LayoutInteractionMap
  extends DayGrid_LayoutInteractionMap, TimeGrid_LayoutInteractionMap, Timeline_LayoutInteractionMap {}

export type Calendar_LayoutInteractionKind = Extract<keyof Calendar_LayoutInteractionMap, string>;

export type Calendar_LayoutPoint<K extends Calendar_LayoutInteractionKind = Calendar_LayoutInteractionKind> = {
  [P in K]: Calendar_LayoutInteractionMap[P]['point'] & { kind: P };
}[K];

export type Calendar_LayoutUnavailable = {
  status: 'unavailable';
  reason: string;
  clock?: Temporal.PlainDateTime;
  candidates?: readonly Temporal.ZonedDateTime[];
};

export type Calendar_LayoutLocation<K extends Calendar_LayoutInteractionKind = Calendar_LayoutInteractionKind> =
  | {
      [P in K]: {
        status: 'valid';
        kind: P;
        target: Calendar_LayoutInteractionMap[P]['target'];
        clock?: Temporal.PlainDateTime;
        candidates?: readonly Temporal.ZonedDateTime[];
      };
    }[K]
  | Calendar_LayoutUnavailable;

export type Calendar_LayoutProjection<K extends Calendar_LayoutInteractionKind = Calendar_LayoutInteractionKind> =
  | { [P in K]: { status: 'valid'; kind: P; geometry: Calendar_LayoutInteractionMap[P]['geometry'] } }[K]
  | Calendar_LayoutUnavailable;

export type Calendar_LayoutInteractionContext<
  TModel extends Calendar_AnyLayout = Calendar_AnyLayout,
  TSettings = any,
> = {
  model: TModel;
  input: Calendar_LayoutInput<unknown, unknown>;
  settings: TSettings;
};

export type Calendar_ActiveLayout = Calendar_LayoutInteractionContext & { feature: Calendar_LayoutFeature };

export type Calendar_LayoutCapabilities<K extends string, TModel extends Calendar_AnyLayout, TSettings> = {
  locate?: (
    context: Calendar_LayoutInteractionContext<TModel, TSettings>,
    point: K extends Calendar_LayoutInteractionKind ? Calendar_LayoutPoint<K> : Calendar_LayoutPoint,
  ) => K extends Calendar_LayoutInteractionKind ? Calendar_LayoutLocation<K> : Calendar_LayoutLocation;
  project?: (
    context: Calendar_LayoutInteractionContext<TModel, TSettings>,
    proposal: import('#features/interaction/interaction.types').Calendar_InteractionProposal,
  ) => K extends Calendar_LayoutInteractionKind ? Calendar_LayoutProjection<K> : Calendar_LayoutProjection;
};
