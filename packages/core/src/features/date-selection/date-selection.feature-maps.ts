import type {
  Calendar_Selection,
  Calendar_SelectionApi,
  Calendar_SelectIntent,
  Calendar_SelectProposal,
} from '#features/date-selection/date-selection.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export interface DateSelection_Options_FeatureMap {
  dateSelectionFeature: {
    selection?: { enabled?: boolean };
    onSelectionChange?: (range: Calendar_Selection) => void;
  };
}

export interface DateSelection_ViewSettings_FeatureMap {
  dateSelectionFeature: { selection?: { enabled?: boolean } };
}

export interface DateSelection_State_FeatureMap {
  dateSelectionFeature: { selectedRange: Calendar_Selection | null };
}

export interface DateSelection_Api_FeatureMap {
  dateSelectionFeature: { selection: Calendar_SelectionApi };
}

export interface DateSelection_OperationMap {
  select: { intent: Calendar_SelectIntent; target: Calendar_DateTarget; proposal: Calendar_SelectProposal };
}
