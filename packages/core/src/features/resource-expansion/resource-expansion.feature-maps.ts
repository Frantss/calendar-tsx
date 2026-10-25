import type {
  Calendar_ResourceExpansion,
  Calendar_ResourceExpansionApi,
} from '#features/resource-expansion/resource-expansion.types';

export interface ResourceExpansion_Options_FeatureMap {
  resourceExpansionFeature: { onResourceExpansionChange?: (expanded: Calendar_ResourceExpansion) => void };
}

export interface ResourceExpansion_State_FeatureMap {
  resourceExpansionFeature: { resourceExpansion: Calendar_ResourceExpansion };
}

export interface ResourceExpansion_Api_FeatureMap {
  resourceExpansionFeature: { resourceExpansion: Calendar_ResourceExpansionApi };
}
