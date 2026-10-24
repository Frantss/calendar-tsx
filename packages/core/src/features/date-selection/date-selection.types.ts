import { Temporal } from 'temporal-polyfill';
import type {
  Calendar_InteractionEvaluation,
  Calendar_InteractionStart,
} from '#features/interaction/interaction.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export type Calendar_Selection =
  | { kind: 'timed'; start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime; resourceIds?: string[] }
  | { kind: 'allDay'; start: Temporal.PlainDate; end: Temporal.PlainDate; resourceIds?: string[] };

export type Calendar_SelectIntent = { kind: 'select'; anchor: Calendar_DateTarget };

export type Calendar_SelectProposal = { kind: 'select'; range: Calendar_Selection };

export type Calendar_SelectionApi = {
  begin: (anchor: Calendar_DateTarget) => Calendar_InteractionStart<'select', unknown>;
  evaluate: (
    anchor: Calendar_DateTarget,
    target: Calendar_DateTarget,
  ) => Calendar_InteractionEvaluation<Calendar_SelectProposal>;
};
