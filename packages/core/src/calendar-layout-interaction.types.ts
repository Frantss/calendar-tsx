import type { Temporal } from 'temporal-polyfill';
import type { Calendar_DateTarget } from '#calendar-editing';
import type { Calendar_AnyLayout, Calendar_LayoutInput } from '#layouts/layout.types';
import type { Calendar_LayoutFeature } from '#features/feature.types';

type DatePoint = { fraction: number; dateKind?: 'timed' | 'allDay'; offset?: string; edge?: 'start' | 'end' };
export type Calendar_TimeGridPoint = DatePoint & {
  kind: 'timeGrid';
  surface: { kind: 'column'; key: string } | { kind: 'allDay' };
};
export type Calendar_TimelinePoint = DatePoint & {
  kind: 'timeline';
  surface: { kind: 'lane'; key: string };
};
export type Calendar_DayGridPoint = DatePoint & {
  kind: 'dayGrid';
  surface: { kind: 'row'; section: string; row: string };
  time?: string;
};
/** Fractions along a surface's date/time axis; previews do not repack the base layout. */
export type Calendar_DatePreview = {
  surface: string;
  start: number;
  span: number;
  inlineStart?: number;
  inlineSize?: number;
};
export interface Calendar_LayoutInteractionMap {
  dayGrid: { point: Calendar_DayGridPoint; target: Calendar_DateTarget; geometry: readonly Calendar_DatePreview[] };
  timeGrid: { point: Calendar_TimeGridPoint; target: Calendar_DateTarget; geometry: readonly Calendar_DatePreview[] };
  timeline: { point: Calendar_TimelinePoint; target: Calendar_DateTarget; geometry: readonly Calendar_DatePreview[] };
}
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
    proposal: import('#calendar-interaction.types').Calendar_InteractionProposal,
  ) => K extends Calendar_LayoutInteractionKind ? Calendar_LayoutProjection<K> : Calendar_LayoutProjection;
};
