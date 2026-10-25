import type { Calendar_Resource } from '#calendar/calendar.types';

export type Calendar_ResourceNode<TResourceData> = {
  resource: Calendar_Resource<TResourceData>;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
};
