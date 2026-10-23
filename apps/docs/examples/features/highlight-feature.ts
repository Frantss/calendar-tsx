import type { Calendar_Event, Calendar_Feature, Calendar_TimeGridLayout } from '@calendar-tsx/core';

export type HighlightSettings = { only?: boolean };

// #region types
declare module '@calendar-tsx/core' {
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    highlightFeature: { highlight?: HighlightSettings };
  }
  interface Calendar_ViewSettings_FeatureMap {
    highlightFeature: { highlight?: HighlightSettings };
  }
  interface Calendar_State_FeatureMap {
    highlightFeature: { highlighted: string | null };
  }
  interface Calendar_Api_FeatureMap {
    highlightFeature: { highlight: (id: string | null) => void };
  }
  interface Calendar_TimeGridSegment_FeatureMap {
    highlightFeature: { isHighlighted: boolean };
  }
}
// #endregion types

// #region feature
export const highlightFeature = {
  getInitialState: () => ({ highlighted: null }),
  constructApi: context => ({
    highlight: (id: string | null) => context.setState('highlighted', () => id),
  }),
  events: {
    deps: context => [context.getState('highlighted'), context.settings<HighlightSettings>('highlight', {}).only],
    run: (events, context) => {
      const highlighted = context.getState<string | null>('highlighted');
      const { only } = context.settings<HighlightSettings>('highlight', { only: false });

      return only && highlighted ? events.filter(event => event.id === highlighted) : events;
    },
  },
  decorate: {
    deps: context => [context.getState('highlighted')],
    run: (layout, context) => {
      if (layout.kind !== 'timeGrid') return layout;

      const highlighted = context.getState<string | null>('highlighted');
      const grid = layout as Calendar_TimeGridLayout<unknown, unknown>;
      const is = (event: Calendar_Event<unknown>) => event.id === highlighted;

      return {
        ...grid,
        columns: grid.columns.map(column => ({
          ...column,
          segments: column.segments.map(segment => ({ ...segment, isHighlighted: is(segment.event) })),
        })),
      };
    },
  },
} satisfies Calendar_Feature;
// #endregion feature
