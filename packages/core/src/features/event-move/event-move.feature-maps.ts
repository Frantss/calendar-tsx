import type {
  Calendar_MoveProposal,
  Calendar_MoveApi,
  Calendar_MoveIntent,
} from '#features/event-move/event-move.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export interface EventMove_Options_FeatureMap<TData> {
  eventMoveFeature: {
    movement?: import('#features/event-move/event-move.types').Calendar_MovementSettings;
    onEventMove?: (proposal: Calendar_MoveProposal<TData>) => void;
  };
}

export interface EventMove_ViewSettings_FeatureMap {
  eventMoveFeature: { movement?: import('#features/event-move/event-move.types').Calendar_MovementSettings };
}

export interface EventMove_Api_FeatureMap<TData> {
  eventMoveFeature: { move: Calendar_MoveApi<TData> };
}

export interface EventMove_OperationMap<TData> {
  move: { intent: Calendar_MoveIntent; target: Calendar_DateTarget; proposal: Calendar_MoveProposal<TData> };
}
