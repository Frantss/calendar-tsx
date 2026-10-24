import type { Calendar_DayBackground, Calendar_BackgroundSegment } from '#features/background/background.types';

export interface Background_DayGridDay_FeatureMap {
  backgroundFeature: { backgrounds: Calendar_DayBackground[] };
}
export interface Background_TimeGridColumn_FeatureMap {
  backgroundFeature: { backgrounds: Calendar_BackgroundSegment[] };
}
export interface Background_TimelineRow_FeatureMap {
  backgroundFeature: { backgrounds: Calendar_BackgroundSegment[] };
}
