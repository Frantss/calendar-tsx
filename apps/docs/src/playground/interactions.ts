import {
  calendarFeatures,
  resourceExpansionFeature,
  interactionFeature,
  pointerFeature,
  dateSelectionFeature,
  eventMoveFeature,
  eventResizeFeature,
  constraintsFeature,
  touchFeature,
  autoScrollFeature,
  externalDropFeature,
  eventTransferFeature,
} from '@calendar-tsx/core';
import type { Calendar_EventInput } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import type { Booking } from './sample-data';

export const defaultInteractions = {
  selection: false,
  movement: false,
  resizing: false,
  touch: false,
  autoScroll: false,
  externalDrop: false,
  transfer: false,
  preventOverlap: false,
  businessHours: false,
  resourceAvailability: false,
  allowConversion: false,
  preserveDuration: false,
  replaceSource: false,
};
export type PlaygroundInteractions = typeof defaultInteractions;
export const interactionOptions: { key: keyof PlaygroundInteractions; label: string }[] = [
  { key: 'selection', label: 'Select dates and times' },
  { key: 'movement', label: 'Move events' },
  { key: 'resizing', label: 'Resize events' },
  { key: 'touch', label: 'Touch long press' },
  { key: 'autoScroll', label: 'Scroll while dragging' },
  { key: 'externalDrop', label: 'Drop new events' },
  { key: 'transfer', label: 'Transfer between calendars' },
  { key: 'preventOverlap', label: 'Prevent overlap' },
  { key: 'businessHours', label: 'Weekdays, 09:00–17:00' },
  { key: 'resourceAvailability', label: 'Respect room availability' },
  { key: 'allowConversion', label: 'Convert timed / all-day' },
  { key: 'preserveDuration', label: 'Keep duration on conversion' },
  { key: 'replaceSource', label: 'Replace only dragged room' },
];
export const parseInteractions = (value: unknown): PlaygroundInteractions =>
  Object.fromEntries(
    Object.entries(defaultInteractions).map(([key, fallback]) => [
      key,
      value && typeof value === 'object' && key in value && typeof (value as Record<string, unknown>)[key] === 'boolean'
        ? (value as Record<string, boolean>)[key]
        : fallback,
    ]),
  ) as PlaygroundInteractions;

export const createPlaygroundFeatures = (settings: PlaygroundInteractions) =>
  calendarFeatures({
    resourceExpansionFeature: resourceExpansionFeature(),
    interactionFeature: interactionFeature(),
    pointerFeature: pointerFeature(),
    ...(settings.selection ? { dateSelectionFeature: dateSelectionFeature() } : {}),
    ...(settings.movement ? { eventMoveFeature: eventMoveFeature() } : {}),
    ...(settings.resizing ? { eventResizeFeature: eventResizeFeature() } : {}),
    ...(settings.touch ? { touchFeature: touchFeature() } : {}),
    ...(settings.autoScroll ? { autoScrollFeature: autoScrollFeature() } : {}),
    ...(settings.externalDrop ? { externalDropFeature: externalDropFeature() } : {}),
    ...(settings.transfer ? { eventTransferFeature: eventTransferFeature() } : {}),
    ...(settings.preventOverlap || settings.businessHours || settings.resourceAvailability
      ? { constraintsFeature: constraintsFeature() }
      : {}),
  });

export type PlaygroundCalendarId = 'primary' | 'secondary';
export type PlaygroundChange = {
  calendar: PlaygroundCalendarId;
  id: string;
  title: string;
  kind: 'timed' | 'allDay';
  start: string;
  end: string;
  resourceIds: string[];
};
export const storeEvent = (event: Calendar_EventInput<Booking>, calendar: PlaygroundCalendarId): PlaygroundChange => ({
  calendar,
  id: event.id,
  title: event.data.title,
  kind: event.kind,
  start: event.start.toString(),
  end: (event.end ?? event.start).toString(),
  resourceIds: [...(event.resourceIds ?? [])],
});
export const restoreEvent = (event: PlaygroundChange): Calendar_EventInput<Booking> => {
  const common = { id: event.id, resourceIds: event.resourceIds, data: { title: event.title } };
  return event.kind === 'allDay'
    ? {
        ...common,
        kind: 'allDay',
        start: Temporal.PlainDate.from(event.start),
        end: Temporal.PlainDate.from(event.end),
      }
    : {
        ...common,
        kind: 'timed',
        start: Temporal.ZonedDateTime.from(event.start),
        end: Temporal.ZonedDateTime.from(event.end),
      };
};
export const parseChanges = (input: unknown): PlaygroundChange[] => {
  if (!Array.isArray(input)) return [];
  const changes = new Map<string, PlaygroundChange>();
  for (const item of input) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.id !== 'string' ||
      !item.id ||
      typeof item.title !== 'string' ||
      !['primary', 'secondary'].includes(item.calendar) ||
      !['timed', 'allDay'].includes(item.kind) ||
      typeof item.start !== 'string' ||
      typeof item.end !== 'string' ||
      !Array.isArray(item.resourceIds) ||
      !item.resourceIds.every((id: unknown) => typeof id === 'string')
    )
      continue;
    try {
      const event = restoreEvent(item);
      const order =
        event.kind === 'timed'
          ? Temporal.ZonedDateTime.compare(event.start, event.end)
          : Temporal.PlainDate.compare(event.start, event.end ?? event.start);
      if (order > 0 || (event.kind === 'timed' && order === 0)) continue;
      changes.set(item.id, storeEvent(event, item.calendar));
    } catch {
      /* Ignore malformed shared-link events. */
    }
  }
  return [...changes.values()];
};
export const applyChanges = (
  events: Calendar_EventInput<Booking>[],
  changes: PlaygroundChange[],
  calendar: PlaygroundCalendarId,
) => {
  const replaced = new Set(changes.map(change => change.id));
  return [
    ...(calendar === 'primary' ? events.filter(event => !replaced.has(event.id)) : []),
    ...changes.filter(change => change.calendar === calendar).map(restoreEvent),
  ];
};
