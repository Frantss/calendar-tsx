import { Temporal } from 'temporal-polyfill';
import type { Calendar_SelectProposal } from '#features/date-selection/date-selection.types';
import type { Calendar_MoveProposal } from '#features/event-move/event-move.types';
import type { Calendar_ResizeProposal } from '#features/event-resize/event-resize.types';

export type Calendar_DateTarget =
  | { kind: 'timed'; at: Temporal.ZonedDateTime; resourceId?: string }
  | { kind: 'allDay'; at: Temporal.PlainDate; resourceId?: string };

export type Calendar_DateProposal<TData = unknown> =
  | Calendar_SelectProposal
  | Calendar_MoveProposal<TData>
  | Calendar_ResizeProposal<TData>;
