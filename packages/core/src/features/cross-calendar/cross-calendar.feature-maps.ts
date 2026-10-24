import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export interface CrossCalendar_Options_FeatureMap<TData> {
  crossCalendarFeature: {
    crossCalendar?: import('#features/cross-calendar/cross-calendar.types').Calendar_CrossCalendarSettings;
    onEventTransfer?: (
      proposal: import('#features/cross-calendar/cross-calendar.types').Calendar_TransferProposal<TData>,
    ) => void;
  };
}

export interface CrossCalendar_ViewSettings_FeatureMap {
  crossCalendarFeature: {
    crossCalendar?: Partial<import('#features/cross-calendar/cross-calendar.types').Calendar_CrossCalendarSettings>;
  };
}

export interface CrossCalendar_Api_FeatureMap<TData> {
  crossCalendarFeature: {
    transfer: import('#features/cross-calendar/cross-calendar.types').Calendar_TransferApi<TData>;
  };
}

export interface CrossCalendar_OperationMap<TData> {
  transfer: {
    intent: import('#features/cross-calendar/cross-calendar.types').Calendar_TransferIntent;
    target: Calendar_DateTarget;
    proposal: import('#features/cross-calendar/cross-calendar.types').Calendar_TransferProposal<TData>;
  };
}
