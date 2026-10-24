import { calendarEvents_checkIds } from '#calendar-events';
import type { Calendar_Event, Calendar_EventSource, Calendar_Features, Calendar_Range } from '#calendar.types';

export const calendarSources_createResolver = (features: Calendar_Features) => {
  let cached:
    | {
        definitions: (Calendar_Event<unknown> | Calendar_EventSource<unknown>)[];
        range: Calendar_Range;
        timeZone: string;
        events: Calendar_Event<unknown>[];
      }
    | undefined;

  return (
    definitions: (Calendar_Event<unknown> | Calendar_EventSource<unknown>)[],
    range: Calendar_Range,
    timeZone: string,
  ): Calendar_Event<unknown>[] => {
    if (
      cached &&
      cached.definitions === definitions &&
      cached.timeZone === timeZone &&
      cached.range.start.equals(range.start) &&
      cached.range.end.equals(range.end)
    )
      return cached.events;

    if (definitions.some(event => event['~source'] !== undefined)) calendarEvents_checkIds(definitions);

    const events = definitions.flatMap(event => {
      const key = event['~source'];
      if (key === undefined) return [event as Calendar_Event<unknown>];

      const resolver = features[key]?.resolveEvents;
      if (!resolver) throw new Error(`[calendar] event source "${key}" has no registered resolver`);

      const resolved = resolver(event as Calendar_EventSource<unknown>, { range, timeZone });
      if (resolved.some(occurrence => occurrence['~source'] !== undefined))
        throw new Error(`[calendar] event source "${key}" returned unresolved definitions`);
      return resolved;
    });

    cached = { definitions, range, timeZone, events };
    return events;
  };
};
