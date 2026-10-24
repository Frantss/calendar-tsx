import { Temporal } from 'temporal-polyfill';
import type { Calendar_EventInput } from '../../src/calendar.types.ts';
import { defineOperation, type Feature, type Start, type Evaluation } from './runtime';

export type Target =
  | { kind: 'timed'; at: Temporal.ZonedDateTime; resourceId?: string }
  | { kind: 'allDay'; at: Temporal.PlainDate; resourceId?: string };
export type Selection =
  | { kind: 'timed'; start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime; resourceIds?: string[] }
  | { kind: 'allDay'; start: Temporal.PlainDate; end: Temporal.PlainDate; resourceIds?: string[] };
export type SelectIntent = { kind: 'select'; anchor: Target };
export type MoveIntent = { kind: 'move'; eventId: string };
export type ResizeIntent = { kind: 'resize'; eventId: string; edge: 'start' | 'end' };
export type SelectProposal = { kind: 'select'; range: Selection };
export type MoveProposal<TData = unknown> = {
  kind: 'move';
  before: Calendar_EventInput<TData>;
  after: Calendar_EventInput<TData>;
};
export type ResizeProposal<TData = unknown> = {
  kind: 'resize';
  edge: ResizeIntent['edge'];
  before: Calendar_EventInput<TData>;
  after: Calendar_EventInput<TData>;
};
export type BuiltinProposal<TData = unknown> = SelectProposal | MoveProposal<TData> | ResizeProposal<TData>;

declare module './runtime' {
  interface OperationMap<TData> {
    select: { intent: SelectIntent; target: Target; proposal: SelectProposal };
    move: { intent: MoveIntent; target: Target; proposal: MoveProposal<TData> };
    resize: { intent: ResizeIntent; target: Target; proposal: ResizeProposal<TData> };
  }
  interface InputSettings {
    selection?: { enabled?: boolean };
    movement?: { enabled?: boolean };
    resizing?: { enabled?: boolean };
    constraints?: { preventOverlap?: boolean };
  }
}
export const isDateTarget = (value: unknown): value is Target => {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('at' in value)) return false;
  return value.kind === 'timed'
    ? value.at instanceof Temporal.ZonedDateTime
    : value.kind === 'allDay' && value.at instanceof Temporal.PlainDate;
};
export const isBuiltinProposal = (proposal: { kind: string }): proposal is BuiltinProposal =>
  proposal.kind === 'select' || proposal.kind === 'move' || proposal.kind === 'resize';
const sameTarget = (a: Target, b: Target) =>
  a.kind === b.kind && a.resourceId === b.resourceId && a.at.toString() === b.at.toString();

type SelectionApi = {
  begin: (anchor: Target) => Start;
  evaluate: (anchor: Target, target: Target) => Evaluation<SelectProposal>;
};
type MoveApi<D = unknown> = {
  begin: (eventId: string) => Start;
  evaluate: (eventId: string, target: Target) => Evaluation<MoveProposal<D>>;
};

type ResizeApi<D> = {
  begin: (eventId: string, edge: ResizeIntent['edge']) => Start;
  evaluate: (eventId: string, edge: ResizeIntent['edge'], target: Target) => Evaluation<ResizeProposal<D>>;
};

declare module '../../src/calendar.types.ts' {
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    dateSelectionFeature: { selection?: { enabled?: boolean }; onSelectionChange?: (range: Selection) => void };
    eventMoveFeature: { movement?: { enabled?: boolean }; onEventMove?: (proposal: MoveProposal<TData>) => void };
    eventResizeFeature: { resizing?: { enabled?: boolean }; onEventResize?: (proposal: ResizeProposal<TData>) => void };
    constraintsFeature: { constraints?: { preventOverlap?: boolean } };
  }
  interface Calendar_ViewSettings_FeatureMap {
    dateSelectionFeature: { selection?: { enabled?: boolean } };
    eventMoveFeature: { movement?: { enabled?: boolean } };
    eventResizeFeature: { resizing?: { enabled?: boolean } };
    constraintsFeature: { constraints?: { preventOverlap?: boolean } };
  }
  interface Calendar_State_FeatureMap {
    dateSelectionFeature: { selectedRange: Selection | null };
  }
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    dateSelectionFeature: { selection: SelectionApi };
    eventMoveFeature: { move: MoveApi<TData> };
    eventResizeFeature: { resize: ResizeApi<TData> };
  }
}

const selectOperation = defineOperation({
  enabled: input => (input.views[input.view].selection?.enabled ?? input.selection?.enabled) !== false,
  acceptsTarget: isDateTarget,
  sameTarget,
  kind: 'select',
  create(intent, target): Evaluation<SelectProposal> {
    if (intent.kind !== 'select' || intent.anchor.kind !== target.kind)
      return { status: 'unavailable', reason: 'different-date-kinds' };
    const anchor = intent.anchor;
    if (anchor.resourceId !== target.resourceId) return { status: 'rejected', reason: 'different-resources' };
    const resourceIds = target.resourceId ? [target.resourceId] : undefined;
    if (anchor.kind === 'timed' && target.kind === 'timed') {
      const forward = Temporal.ZonedDateTime.compare(anchor.at, target.at) < 0;
      const start = forward ? anchor.at : target.at;
      const end = forward ? target.at : anchor.at;
      if (start.equals(end)) return { status: 'rejected', reason: 'empty-range' };
      return { status: 'valid', proposal: { kind: 'select', range: { kind: 'timed', start, end, resourceIds } } };
    }
    if (anchor.kind === 'allDay' && target.kind === 'allDay') {
      const forward = Temporal.PlainDate.compare(anchor.at, target.at) <= 0;
      return {
        status: 'valid',
        proposal: {
          kind: 'select',
          range: {
            kind: 'allDay',
            start: forward ? anchor.at : target.at,
            end: forward ? target.at : anchor.at,
            resourceIds,
          },
        },
      };
    }
    return { status: 'unavailable', reason: 'different-date-kinds' };
  },
  api: commands => ({
    selection: {
      begin: (anchor: Target) => commands.begin({ kind: 'select', anchor }),
      evaluate: (anchor: Target, target: Target) => commands.evaluate({ kind: 'select', anchor }, target),
    },
  }),
  emit: (proposal, options) =>
    (options as { onSelectionChange?: (range: Selection) => void }).onSelectionChange?.(proposal.range),
});

const moveOperation = defineOperation({
  enabled: input => (input.views[input.view].movement?.enabled ?? input.movement?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget,
  kind: 'move',
  create(intent, target, input): Evaluation<MoveProposal> {
    if (intent.kind !== 'move') return { status: 'unavailable', reason: 'wrong-operation' };
    const before = input.events.find(event => event.id === intent.eventId);
    if (!before) return { status: 'rejected', reason: 'source-removed' };
    const resourceIds = target.resourceId ? [target.resourceId] : before.resourceIds;
    if (before.kind === 'timed' && target.kind === 'timed') {
      const milliseconds = before.end.epochMilliseconds - before.start.epochMilliseconds;
      if (milliseconds <= 0) return { status: 'rejected', reason: 'invalid-source-range' };
      return {
        status: 'valid',
        proposal: {
          kind: 'move',
          before,
          after: { ...before, start: target.at, end: target.at.add({ milliseconds }), resourceIds },
        },
      };
    }
    if (before.kind === 'allDay' && target.kind === 'allDay') {
      const days = before.start.until(before.end ?? before.start).days;
      if (days < 0) return { status: 'rejected', reason: 'invalid-source-range' };
      return {
        status: 'valid',
        proposal: {
          kind: 'move',
          before,
          after: { ...before, start: target.at, end: target.at.add({ days }), resourceIds },
        },
      };
    }
    return { status: 'unavailable', reason: 'conversion-not-prototyped' };
  },
  api: commands => ({
    move: {
      begin: (eventId: string) => commands.begin({ kind: 'move', eventId }),
      evaluate: (eventId: string, target: Target) => commands.evaluate({ kind: 'move', eventId }, target),
    },
  }),
  emit: (proposal, options) => (options as { onEventMove?: (proposal: MoveProposal) => void }).onEventMove?.(proposal),
});

const resizeOperation = defineOperation({
  enabled: input => (input.views[input.view].resizing?.enabled ?? input.resizing?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget,
  kind: 'resize',
  create(intent, target, input): Evaluation<ResizeProposal> {
    if (intent.kind !== 'resize') return { status: 'unavailable', reason: 'wrong-operation' };
    if (intent.edge !== 'start' && intent.edge !== 'end') return { status: 'rejected', reason: 'invalid-edge' };
    const before = input.events.find(event => event.id === intent.eventId);
    if (!before) return { status: 'rejected', reason: 'source-removed' };
    if (target.resourceId && before.resourceIds?.length && !before.resourceIds.includes(target.resourceId))
      return { status: 'rejected', reason: 'different-resources' };
    if (before.kind === 'timed' && target.kind === 'timed') {
      if (Temporal.ZonedDateTime.compare(before.start, before.end) >= 0)
        return { status: 'rejected', reason: 'invalid-source-range' };
      const start = intent.edge === 'start' ? target.at : before.start;
      const end = intent.edge === 'end' ? target.at : before.end;
      if (Temporal.ZonedDateTime.compare(start, end) >= 0) return { status: 'rejected', reason: 'invalid-range' };
      return {
        status: 'valid',
        proposal: { kind: 'resize', edge: intent.edge, before, after: { ...before, start, end } },
      };
    }
    if (before.kind === 'allDay' && target.kind === 'allDay') {
      const fixedEnd = before.end ?? before.start;
      if (Temporal.PlainDate.compare(before.start, fixedEnd) > 0)
        return { status: 'rejected', reason: 'invalid-source-range' };
      const start = intent.edge === 'start' ? target.at : before.start;
      const end = intent.edge === 'end' ? target.at : fixedEnd;
      if (Temporal.PlainDate.compare(start, end) > 0) return { status: 'rejected', reason: 'invalid-range' };
      return {
        status: 'valid',
        proposal: { kind: 'resize', edge: intent.edge, before, after: { ...before, start, end } },
      };
    }
    return { status: 'unavailable', reason: 'conversion-not-prototyped' };
  },
  api: commands => ({
    resize: {
      begin: (eventId: string, edge: ResizeIntent['edge']) => commands.begin({ kind: 'resize', eventId, edge }),
      evaluate: (eventId: string, edge: ResizeIntent['edge'], target: Target) =>
        commands.evaluate({ kind: 'resize', eventId, edge }, target),
    },
  }),
  emit: (proposal, options) =>
    (options as { onEventResize?: (proposal: ResizeProposal) => void }).onEventResize?.(proposal),
});

export const dateSelectionFeature = {
  interactionDeps: input => [input.selection, input.views[input.view].selection],
  trackedOptions: [],
  requires: ['interactionFeature'],
  operation: selectOperation,
} as const satisfies Feature;
export const eventMoveFeature = {
  interactionDeps: input => [input.movement, input.views[input.view].movement],
  trackedOptions: [],
  requires: ['interactionFeature'],
  operation: moveOperation,
} as const satisfies Feature;
export const eventResizeFeature = {
  interactionDeps: input => [input.resizing, input.views[input.view].resizing],
  trackedOptions: [],
  requires: ['interactionFeature'],
  operation: resizeOperation,
} as const satisfies Feature;
export const constraintsFeature = {
  interactionDeps: input => [input.constraints, input.views[input.view].constraints],
  trackedOptions: [],
  requires: ['interactionFeature'],
  validate(proposal, input) {
    if (!isBuiltinProposal(proposal)) return;
    if ((input.views[input.view].constraints?.preventOverlap ?? input.constraints?.preventOverlap) === false) return;
    const range = proposal.kind === 'select' ? proposal.range : proposal.after;
    if (range.kind === 'allDay') return;
    const overlapping = input.events.some(event => {
      if (event.kind !== 'timed' || (proposal.kind !== 'select' && event.id === proposal.before.id)) return false;
      if (
        range.resourceIds?.length &&
        event.resourceIds?.length &&
        !range.resourceIds.some(id => event.resourceIds!.includes(id))
      )
        return false;
      return (
        range.start.epochMilliseconds < event.end.epochMilliseconds &&
        range.end.epochMilliseconds > event.start.epochMilliseconds
      );
    });
    return overlapping ? 'overlap' : undefined;
  },
} as const satisfies Feature;

export const resolveClockTarget = (local: string, timeZone: string, sourceOffset?: string): Evaluation<Target> => {
  const dateTime = Temporal.PlainDateTime.from(local);
  const earlier = dateTime.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
  const later = dateTime.toZonedDateTime(timeZone, { disambiguation: 'later' });
  const choices = [earlier, later].filter(at => at.toPlainDateTime().equals(dateTime));
  const at = choices.find(choice => choice.offset === sourceOffset) ?? choices[0];
  return at
    ? { status: 'valid', proposal: { kind: 'timed', at } }
    : { status: 'unavailable', reason: 'nonexistent-time' };
};

export { createRuntime, idle, validateRegistration } from './runtime';
export type { Ownership, Runtime, Snapshot, Feature, Features, Input, Evaluation } from './runtime';
export type Proposal<D = unknown> = BuiltinProposal<D>;

export { interactionFeature } from './interaction-feature';
