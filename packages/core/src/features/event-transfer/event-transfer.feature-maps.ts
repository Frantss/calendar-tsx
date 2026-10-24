import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export interface EventTransfer_Options_FeatureMap<TData> {
  eventTransferFeature: {
    transfer?: import('#features/event-transfer/event-transfer.types').Calendar_TransferSettings;
    onEventTransfer?: (
      proposal: import('#features/event-transfer/event-transfer.types').Calendar_TransferProposal<TData>,
    ) => void;
  };
}

export interface EventTransfer_ViewSettings_FeatureMap {
  eventTransferFeature: {
    transfer?: Partial<import('#features/event-transfer/event-transfer.types').Calendar_TransferSettings>;
  };
}

export interface EventTransfer_Api_FeatureMap<TData> {
  eventTransferFeature: {
    transfer: import('#features/event-transfer/event-transfer.types').Calendar_TransferApi<TData>;
  };
}

export interface EventTransfer_OperationMap<TData> {
  transfer: {
    intent: import('#features/event-transfer/event-transfer.types').Calendar_TransferIntent;
    target: Calendar_DateTarget;
    proposal: import('#features/event-transfer/event-transfer.types').Calendar_TransferProposal<TData>;
  };
}
