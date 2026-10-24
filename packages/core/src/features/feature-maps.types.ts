import type {
  Pointer_Options_FeatureMap,
  Pointer_ViewSettings_FeatureMap,
  Pointer_Api_FeatureMap,
} from '#features/pointer/pointer.feature-maps';
import type { Touch_Options_FeatureMap, Touch_ViewSettings_FeatureMap } from '#features/touch/touch.feature-maps';
import type {
  AutoScroll_Options_FeatureMap,
  AutoScroll_ViewSettings_FeatureMap,
} from '#features/auto-scroll/auto-scroll.feature-maps';
import type {
  ExternalDrop_Options_FeatureMap,
  ExternalDrop_ViewSettings_FeatureMap,
  ExternalDrop_Api_FeatureMap,
} from '#features/external-drop/external-drop.feature-maps';
import type {
  CrossCalendar_Options_FeatureMap,
  CrossCalendar_ViewSettings_FeatureMap,
  CrossCalendar_Api_FeatureMap,
} from '#features/cross-calendar/cross-calendar.feature-maps';
import type {
  Interaction_Options_FeatureMap,
  Interaction_Api_FeatureMap,
} from '#features/interaction/interaction.feature-maps';
import type {
  DateSelection_Options_FeatureMap,
  DateSelection_ViewSettings_FeatureMap,
  DateSelection_State_FeatureMap,
  DateSelection_Api_FeatureMap,
} from '#features/date-selection/date-selection.feature-maps';
import type {
  EventMove_Options_FeatureMap,
  EventMove_ViewSettings_FeatureMap,
  EventMove_Api_FeatureMap,
} from '#features/event-move/event-move.feature-maps';
import type {
  EventResize_Options_FeatureMap,
  EventResize_ViewSettings_FeatureMap,
  EventResize_Api_FeatureMap,
} from '#features/event-resize/event-resize.feature-maps';
import type {
  Constraints_Options_FeatureMap,
  Constraints_ViewSettings_FeatureMap,
} from '#features/constraints/constraints.feature-maps';
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
export interface Calendar_Options_FeatureMap<TData, TResourceData>
  extends
    Pointer_Options_FeatureMap,
    Touch_Options_FeatureMap,
    AutoScroll_Options_FeatureMap,
    ExternalDrop_Options_FeatureMap<TData>,
    CrossCalendar_Options_FeatureMap<TData>,
    Interaction_Options_FeatureMap,
    DateSelection_Options_FeatureMap,
    EventMove_Options_FeatureMap<TData>,
    EventResize_Options_FeatureMap<TData>,
    Constraints_Options_FeatureMap {}
/** Per-view settings a feature adds; a view accepts them only when it lists the feature. */
export interface Calendar_ViewSettings_FeatureMap
  extends
    Pointer_ViewSettings_FeatureMap,
    Touch_ViewSettings_FeatureMap,
    AutoScroll_ViewSettings_FeatureMap,
    ExternalDrop_ViewSettings_FeatureMap,
    CrossCalendar_ViewSettings_FeatureMap,
    DateSelection_ViewSettings_FeatureMap,
    EventMove_ViewSettings_FeatureMap,
    EventResize_ViewSettings_FeatureMap,
    Constraints_ViewSettings_FeatureMap {}
/** State slices a feature owns; each is uncontrolled, controlled through `state`, or external through `atoms`. */
export interface Calendar_State_FeatureMap extends DateSelection_State_FeatureMap {}
/** Actions a feature merges onto `api`, with the consumer's event and resource payload types. */
// oxlint-disable-next-line no-unused-vars -- merges must repeat the generics
export interface Calendar_Api_FeatureMap<TData = unknown, TResourceData = unknown>
  extends
    Pointer_Api_FeatureMap,
    ExternalDrop_Api_FeatureMap<TData>,
    CrossCalendar_Api_FeatureMap<TData>,
    Interaction_Api_FeatureMap,
    DateSelection_Api_FeatureMap,
    EventMove_Api_FeatureMap<TData>,
    EventResize_Api_FeatureMap<TData> {}
