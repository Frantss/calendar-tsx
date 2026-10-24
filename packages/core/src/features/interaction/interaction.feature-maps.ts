import type {
  Calendar_InteractionOwnership,
  Calendar_InteractionControls,
} from '#features/interaction/interaction.types';

export interface Interaction_Options_FeatureMap {
  interactionFeature: {
    interactionOwnership?: Calendar_InteractionOwnership;
    eventRelocationPolicy?: import('#features/interaction/scheduling.types').Calendar_EventRelocationPolicy;
  };
}

export interface Interaction_Api_FeatureMap {
  interactionFeature: { interactions: Calendar_InteractionControls };
}
