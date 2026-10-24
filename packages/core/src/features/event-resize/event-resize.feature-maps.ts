import type {
  Calendar_ResizeProposal,
  Calendar_ResizeApi,
  Calendar_ResizeIntent,
} from '#features/event-resize/event-resize.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export interface EventResize_Options_FeatureMap<TData> {
  eventResizeFeature: {
    resizing?: import('#features/event-resize/event-resize.types').Calendar_ResizeSettings;
    onEventResize?: (proposal: Calendar_ResizeProposal<TData>) => void;
  };
}

export interface EventResize_ViewSettings_FeatureMap {
  eventResizeFeature: { resizing?: import('#features/event-resize/event-resize.types').Calendar_ResizeSettings };
}

export interface EventResize_Api_FeatureMap<TData> {
  eventResizeFeature: { resize: Calendar_ResizeApi<TData> };
}

export interface EventResize_OperationMap<TData> {
  resize: { intent: Calendar_ResizeIntent; target: Calendar_DateTarget; proposal: Calendar_ResizeProposal<TData> };
}
