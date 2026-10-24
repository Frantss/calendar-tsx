import { calendarMovement_place, calendarConstraints_check } from '#calendar-policies';
import { Temporal } from 'temporal-polyfill';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { createInteractionOperation } from '#calendar-interactions';
import type { Calendar_InteractionEvaluation, Calendar_InteractionStart } from '#calendar-interaction.types';

export type Calendar_DateTarget =
  | { kind: 'timed'; at: Temporal.ZonedDateTime; resourceId?: string }
  | { kind: 'allDay'; at: Temporal.PlainDate; resourceId?: string };
export type Calendar_Selection =
  | { kind: 'timed'; start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime; resourceIds?: string[] }
  | { kind: 'allDay'; start: Temporal.PlainDate; end: Temporal.PlainDate; resourceIds?: string[] };
export type Calendar_SelectIntent = { kind: 'select'; anchor: Calendar_DateTarget };
export type Calendar_MoveIntent = { kind: 'move'; eventId: string; sourceResourceId?: string };
export type Calendar_ResizeIntent = { kind: 'resize'; eventId: string; edge: 'start' | 'end' };
export type Calendar_SelectProposal = { kind: 'select'; range: Calendar_Selection };
export type Calendar_MoveProposal<TData = unknown> = {
  kind: 'move';
  before: Calendar_EventInput<TData>;
  after: Calendar_EventInput<TData>;
};
export type Calendar_ResizeProposal<TData = unknown> = {
  kind: 'resize';
  edge: Calendar_ResizeIntent['edge'];
  before: Calendar_EventInput<TData>;
  after: Calendar_EventInput<TData>;
};
export type Calendar_DateProposal<TData = unknown> =
  | Calendar_SelectProposal
  | Calendar_MoveProposal<TData>
  | Calendar_ResizeProposal<TData>;

export const isDateTarget = (value: unknown): value is Calendar_DateTarget => {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('at' in value)) return false;
  return value.kind === 'timed'
    ? value.at instanceof Temporal.ZonedDateTime
    : value.kind === 'allDay' && value.at instanceof Temporal.PlainDate;
};
export const isBuiltinProposal = (proposal: { kind: string }): proposal is Calendar_DateProposal =>
  proposal.kind === 'select' || proposal.kind === 'move' || proposal.kind === 'resize';
export const calendarDateTarget_equal = (a: Calendar_DateTarget, b: Calendar_DateTarget) =>
  a.kind === b.kind && a.resourceId === b.resourceId && a.at.toString() === b.at.toString();

export type Calendar_SelectionApi = {
  begin: (anchor: Calendar_DateTarget) => Calendar_InteractionStart;
  evaluate: (
    anchor: Calendar_DateTarget,
    target: Calendar_DateTarget,
  ) => Calendar_InteractionEvaluation<Calendar_SelectProposal>;
};
export type Calendar_MoveApi<D = unknown> = {
  begin: (eventId: string, sourceResourceId?: string) => Calendar_InteractionStart;
  evaluate: (
    eventId: string,
    target: Calendar_DateTarget,
    sourceResourceId?: string,
  ) => Calendar_InteractionEvaluation<Calendar_MoveProposal<D>>;
};

export type Calendar_ResizeApi<D> = {
  begin: (eventId: string, edge: Calendar_ResizeIntent['edge']) => Calendar_InteractionStart;
  evaluate: (
    eventId: string,
    edge: Calendar_ResizeIntent['edge'],
    target: Calendar_DateTarget,
  ) => Calendar_InteractionEvaluation<Calendar_ResizeProposal<D>>;
};

const selectOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].selection?.enabled ?? input.selection?.enabled) !== false,
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'select',
  create(intent, target): Calendar_InteractionEvaluation<Calendar_SelectProposal> {
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
      begin: (anchor: Calendar_DateTarget) => commands.begin({ kind: 'select', anchor }),
      evaluate: (anchor: Calendar_DateTarget, target: Calendar_DateTarget) =>
        commands.evaluate({ kind: 'select', anchor }, target),
    },
  }),
  emit: (proposal, context) => {
    context.setState('selectedRange', () => proposal.range);
    context.options.onSelectionChange?.(proposal.range);
  },
});

const moveOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].movement?.enabled ?? input.movement?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'move',
  create(intent, target, input): Calendar_InteractionEvaluation<Calendar_MoveProposal> {
    if (intent.kind !== 'move') return { status: 'unavailable', reason: 'wrong-operation' };
    const before = input.events.find(event => event.id === intent.eventId);
    if (!before) return { status: 'rejected', reason: 'source-removed' };
    if (before['~source']) return { status: 'unavailable', reason: 'source-unsupported' };
    const after = calendarMovement_place(
      before,
      target,
      { ...input.movement, ...input.views[input.view].movement },
      intent.sourceResourceId,
    );
    return typeof after === 'string'
      ? { status: 'unavailable', reason: after }
      : { status: 'valid', proposal: { kind: 'move', before, after } };
  },
  api: commands => ({
    move: {
      begin: (eventId: string, sourceResourceId?: string) =>
        commands.begin({ kind: 'move', eventId, sourceResourceId }),
      evaluate: (eventId: string, target: Calendar_DateTarget, sourceResourceId?: string) =>
        commands.evaluate({ kind: 'move', eventId, sourceResourceId }, target),
    },
  }),
  emit: (proposal, context) => context.options.onEventMove?.(proposal),
});

const resizeOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].resizing?.enabled ?? input.resizing?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'resize',
  create(intent, target, input): Calendar_InteractionEvaluation<Calendar_ResizeProposal> {
    if (intent.kind !== 'resize') return { status: 'unavailable', reason: 'wrong-operation' };
    if (intent.edge !== 'start' && intent.edge !== 'end') return { status: 'rejected', reason: 'invalid-edge' };
    const before = input.events.find(event => event.id === intent.eventId);
    if (!before) return { status: 'rejected', reason: 'source-removed' };
    if (before['~source']) return { status: 'unavailable', reason: 'source-unsupported' };
    const settings = { ...input.resizing, ...input.views[input.view].resizing };
    if (
      (intent.edge === 'start' && settings.fromStart === false) ||
      settings.canResize?.(before, intent.edge) === false
    )
      return { status: 'rejected', reason: 'event-not-editable' };
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
    return { status: 'unavailable', reason: 'conversion-unsupported' };
  },
  api: commands => ({
    resize: {
      begin: (eventId: string, edge: Calendar_ResizeIntent['edge']) =>
        commands.begin({ kind: 'resize', eventId, edge }),
      evaluate: (eventId: string, edge: Calendar_ResizeIntent['edge'], target: Calendar_DateTarget) =>
        commands.evaluate({ kind: 'resize', eventId, edge }, target),
    },
  }),
  emit: (proposal, context) => context.options.onEventResize?.(proposal),
});

export const dateSelectionFeature = (config: { enabled?: boolean } = {}) =>
  ({
    '~id': 'dateSelectionFeature',
    '~config': config,
    requires: ['interactionFeature'],
    getInitialState: () => ({ selectedRange: null as Calendar_Selection | null }),
    interaction: {
      settings: 'selection',
      deps: input => [input.selection?.enabled, input.views[input.view].selection?.enabled],
      operation: selectOperation,
    },
  }) as const satisfies Calendar_ConfiguredFeature;
export const eventMoveFeature = (config: import('#calendar-policies').Calendar_MovementSettings = {}) =>
  ({
    '~id': 'eventMoveFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'movement',
      deps: input => [
        input.movement?.enabled,
        input.movement?.allowConversion,
        input.movement?.conversionDuration,
        input.movement?.defaultTimedMinutes,
        input.movement?.resourceMode,
        input.movement?.allowResourceChange,
        input.movement?.canMove,
        ...Object.values(input.views[input.view].movement ?? {}),
      ],
      operation: moveOperation,
    },
  }) as const satisfies Calendar_ConfiguredFeature;
export const eventResizeFeature = (config: import('#calendar-policies').Calendar_ResizeSettings = {}) =>
  ({
    '~id': 'eventResizeFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'resizing',
      deps: input => [
        input.resizing?.enabled,
        input.resizing?.fromStart,
        input.resizing?.canResize,
        ...Object.values(input.views[input.view].resizing ?? {}),
      ],
      operation: resizeOperation,
    },
  }) as const satisfies Calendar_ConfiguredFeature;
export const constraintsFeature = (config: import('#calendar-policies').Calendar_ConstraintSettings = {}) =>
  ({
    '~id': 'constraintsFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'constraints',
      deps: input => [
        ...Object.values(input.constraints ?? {}),
        ...Object.values(input.views[input.view].constraints ?? {}),
      ],
      validate(proposal, input) {
        if (isBuiltinProposal(proposal))
          return calendarConstraints_check(
            proposal,
            proposal.kind === 'select' ? proposal.range : proposal.after,
            input,
            proposal.kind === 'select' ? undefined : proposal.before.id,
          );
        if (proposal.kind === 'create' || proposal.kind === 'transfer')
          return calendarConstraints_check(proposal, proposal.after, input);
      },
    },
  }) as const satisfies Calendar_ConfiguredFeature;
