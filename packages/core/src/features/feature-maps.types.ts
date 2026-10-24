import type { Calendar_InteractionOwnership, Calendar_InteractionControls } from '#calendar-interaction.types';
import type {
  Calendar_Selection,
  Calendar_MoveProposal,
  Calendar_ResizeProposal,
  Calendar_SelectionApi,
  Calendar_MoveApi,
  Calendar_ResizeApi,
} from '#calendar-editing';
import type {
  Background_DayGridDay_FeatureMap,
  Background_TimeGridColumn_FeatureMap,
  Background_TimelineRow_FeatureMap,
} from '#features/background/background.feature-maps';
import type { Recurrence_EventInput_FeatureMap } from '#features/recurrence/recurrence.feature-maps';
import type { Calendar_DayGridLayout } from '#layouts/day-grid/day-grid.types';
import type { Calendar_TimeGridLayout } from '#layouts/time-grid/time-grid.types';
import type { Calendar_ListLayout } from '#layouts/list/list.types';
import type { Calendar_TimelineLayout } from '#layouts/timeline/timeline.types';

/** Feature-owned event definitions, keyed by the feature's export name. */
export interface Calendar_EventInput_FeatureMap<TData> extends Recurrence_EventInput_FeatureMap<TData> {}

/*
 * Feature maps (D29). Features extend them by declaration merging, keyed by the feature's export name; each map is
 * filtered by the features a calendar or view registers.
 */

/** Model fields a feature adds to the layouts of the views that list it. */
export interface Calendar_DayGridDay_FeatureMap extends Background_DayGridDay_FeatureMap {}
export interface Calendar_BarSegment_FeatureMap {}
export interface Calendar_TimeGridColumn_FeatureMap extends Background_TimeGridColumn_FeatureMap {}
export interface Calendar_TimeGridSegment_FeatureMap {}
export interface Calendar_ListDay_FeatureMap {}
export interface Calendar_TimelineRow_FeatureMap extends Background_TimelineRow_FeatureMap {}
export interface Calendar_TimelineSegment_FeatureMap {}

/** Layout key → layout, given the features of the view it renders. Layout features extend it by declaration merging. */
export interface Calendar_Layout_FeatureMap<TData, TResourceData, TFeatures> {
  dayGridLayout: Calendar_DayGridLayout<TData, TResourceData, TFeatures>;
  timeGridLayout: Calendar_TimeGridLayout<TData, TResourceData, TFeatures>;
  listLayout: Calendar_ListLayout<TData, TResourceData, TFeatures>;
  timelineLayout: Calendar_TimelineLayout<TData, TResourceData, TFeatures>;
}

// oxlint-disable-next-line no-unused-vars -- merges must repeat the generics
export interface Calendar_Options_FeatureMap<TData, TResourceData> {
  pointerFeature: { pointer?: import('#calendar-input').Calendar_PointerSettings };
  touchFeature: { touch?: import('#calendar-input').Calendar_TouchSettings };
  autoScrollFeature: { autoScroll?: import('#calendar-input').Calendar_AutoScrollSettings };
  externalDropFeature: {
    externalDrop?: import('#calendar-transfers').Calendar_ExternalDropSettings<TData>;
    onExternalDrop?: (proposal: import('#calendar-transfers').Calendar_CreateProposal<TData>) => void;
  };
  crossCalendarFeature: {
    crossCalendar?: import('#calendar-transfers').Calendar_CrossCalendarSettings;
    onEventTransfer?: (proposal: import('#calendar-transfers').Calendar_TransferProposal<TData>) => void;
    onEventReceive?: (proposal: import('#calendar-transfers').Calendar_TransferProposal<TData>) => void;
  };
  interactionFeature: { interactionOwnership?: Calendar_InteractionOwnership };
  dateSelectionFeature: {
    selection?: { enabled?: boolean };
    onSelectionChange?: (range: Calendar_Selection) => void;
  };
  eventMoveFeature: {
    movement?: import('#calendar-policies').Calendar_MovementSettings;
    onEventMove?: (proposal: Calendar_MoveProposal<TData>) => void;
  };
  eventResizeFeature: {
    resizing?: import('#calendar-policies').Calendar_ResizeSettings;
    onEventResize?: (proposal: Calendar_ResizeProposal<TData>) => void;
  };
  constraintsFeature: { constraints?: import('#calendar-policies').Calendar_ConstraintSettings };
}
/** Per-view settings a feature adds; a view accepts them only when it lists the feature. */
export interface Calendar_ViewSettings_FeatureMap {
  pointerFeature: { pointer?: import('#calendar-input').Calendar_PointerSettings };
  touchFeature: { touch?: import('#calendar-input').Calendar_TouchSettings };
  autoScrollFeature: { autoScroll?: import('#calendar-input').Calendar_AutoScrollSettings };
  externalDropFeature: { externalDrop?: import('#calendar-transfers').Calendar_ExternalDropSettings };
  crossCalendarFeature: { crossCalendar?: Partial<import('#calendar-transfers').Calendar_CrossCalendarSettings> };
  dateSelectionFeature: { selection?: { enabled?: boolean } };
  eventMoveFeature: { movement?: import('#calendar-policies').Calendar_MovementSettings };
  eventResizeFeature: { resizing?: import('#calendar-policies').Calendar_ResizeSettings };
  constraintsFeature: { constraints?: import('#calendar-policies').Calendar_ConstraintSettings };
}
/** State slices a feature owns; each is uncontrolled, controlled through `state`, or external through `atoms`. */
export interface Calendar_State_FeatureMap {
  dateSelectionFeature: { selectedRange: Calendar_Selection | null };
}
/** Actions a feature merges onto `api`, with the consumer's event and resource payload types. */
// oxlint-disable-next-line no-unused-vars -- merges must repeat the generics
export interface Calendar_Api_FeatureMap<TData = unknown, TResourceData = unknown> {
  pointerFeature: { pointer: import('#calendar-input').Calendar_PointerApi };
  externalDropFeature: { externalDrop: import('#calendar-transfers').Calendar_ExternalDropApi<TData> };
  crossCalendarFeature: {
    transfer: import('#calendar-transfers').Calendar_TransferApi<TData>;
    crossCalendar: import('#calendar-transfers').Calendar_CrossCalendarApi<TData>;
  };
  interactionFeature: { interactions: Calendar_InteractionControls };
  dateSelectionFeature: { selection: Calendar_SelectionApi };
  eventMoveFeature: { move: Calendar_MoveApi<TData> };
  eventResizeFeature: { resize: Calendar_ResizeApi<TData> };
}
