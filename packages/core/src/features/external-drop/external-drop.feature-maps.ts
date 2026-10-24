import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export interface ExternalDrop_Options_FeatureMap<TData> {
  externalDropFeature: {
    externalDrop?: import('#features/external-drop/external-drop.types').Calendar_ExternalDropSettings<TData>;
    onExternalDrop?: (
      proposal: import('#features/external-drop/external-drop.types').Calendar_CreateProposal<TData>,
    ) => void;
  };
}

export interface ExternalDrop_ViewSettings_FeatureMap {
  externalDropFeature: {
    externalDrop?: import('#features/external-drop/external-drop.types').Calendar_ExternalDropSettings;
  };
}

export interface ExternalDrop_Api_FeatureMap<TData> {
  externalDropFeature: {
    externalDrop: import('#features/external-drop/external-drop.types').Calendar_ExternalDropApi<TData>;
  };
}

export interface ExternalDrop_OperationMap<TData> {
  create: {
    intent: import('#features/external-drop/external-drop.types').Calendar_CreateIntent;
    target: Calendar_DateTarget;
    proposal: import('#features/external-drop/external-drop.types').Calendar_CreateProposal<TData>;
  };
}
