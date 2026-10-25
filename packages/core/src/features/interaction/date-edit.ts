import { Temporal } from 'temporal-polyfill';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type { Calendar_TransferSource } from '#features/event-transfer/event-transfer.types';
import type {
  Calendar_InteractionInput,
  Calendar_InteractionIntent,
  Calendar_InteractionEvaluation,
  Calendar_InteractionProposal,
} from '#features/interaction/interaction.types';
import { calendarPlacement_place, calendarRelocation_resolve } from '#features/interaction/placement';

type Kind = 'move' | 'resize' | 'create' | 'transfer';
type Intent = {
  kind: string;
  eventId?: string;
  edge?: 'start' | 'end';
  sourceResourceId?: string;
  event?: Calendar_EventInput<unknown>;
  metadata?: unknown;
  source?: Calendar_TransferSource;
};
const evaluate = (kind: Kind, intent: Intent, target: Calendar_DateTarget, input: Calendar_InteractionInput) => {
  const fail = (reason: string, status: 'rejected' | 'unavailable' = 'rejected') => ({ status, reason });
  let before: Calendar_EventInput<unknown> | undefined;
  if (kind === 'move' || kind === 'resize') {
    if (intent.kind !== kind) return fail('wrong-operation', 'unavailable');
    if (kind === 'resize' && intent.edge !== 'start' && intent.edge !== 'end') return fail('invalid-edge');
    const source = input.events.find(event => event.id === intent.eventId);
    if (!source) return fail('source-removed');
    if (source['~source']) return fail('source-unsupported', 'unavailable');
    before = source;
    if (kind === 'move') {
      const settings = { ...input.movement, ...input.views[input.view].movement };
      if (settings.canMove?.(before) === false) return fail('event-not-editable', 'unavailable');
    } else {
      const settings = { ...input.resizing, ...input.views[input.view].resizing };
      if (
        (intent.edge === 'start' && settings.fromStart === false) ||
        settings.canResize?.(before, intent.edge!) === false
      )
        return fail('event-not-editable');
      if (target.resourceId && before.resourceIds?.length && !before.resourceIds.includes(target.resourceId))
        return fail('different-resources');
      if (before.kind !== target.kind) return fail('conversion-unsupported', 'unavailable');
      const timed = before.kind === 'timed';
      const compare = (
        a: Temporal.PlainDate | Temporal.ZonedDateTime,
        b: Temporal.PlainDate | Temporal.ZonedDateTime,
      ) =>
        timed
          ? Temporal.ZonedDateTime.compare(a as Temporal.ZonedDateTime, b as Temporal.ZonedDateTime)
          : Temporal.PlainDate.compare(a as Temporal.PlainDate, b as Temporal.PlainDate);
      const threshold = before.kind === 'timed' ? 0 : 1;
      const fixedEnd = before.end ?? before.start;
      if (compare(before.start, fixedEnd) >= threshold) return fail('invalid-source-range');
      const start = intent.edge === 'start' ? target.at : before.start;
      const end = intent.edge === 'end' ? target.at : fixedEnd;
      if (compare(start, end) >= threshold) return fail('invalid-range');
      return {
        status: 'valid' as const,
        proposal: { kind, edge: intent.edge, before, after: { ...before, start, end } },
      };
    }
  } else if (kind === 'transfer') {
    before = intent.source!.read();
    if (!before) return fail('source-changed', 'unavailable');
    const settings = { ...input.transfer, ...input.views[input.view].transfer };
    if (!input.id || input.id === intent.source!.id) return fail('same-calendar');
    if (settings.accept?.(intent.source!.id) === false) return fail('calendar-rejected');
    if (input.events.some(event => event.id === before!.id)) return fail('duplicate-event-id');
  } else {
    before = intent.event!;
    const settings = { ...input.externalDrop, ...input.views[input.view].externalDrop };
    if (settings.accept?.(before, intent.metadata) === false) return fail('external-source-rejected');
    if (input.events.some(event => event.id === before!.id)) return fail('duplicate-event-id');
  }
  const key = kind === 'move' ? 'movement' : kind === 'create' ? 'externalDrop' : 'transfer';
  const after = calendarPlacement_place(
    before,
    target,
    calendarRelocation_resolve(input, key),
    kind === 'transfer' ? intent.source!.sourceResourceId : intent.sourceResourceId,
  );
  if (typeof after === 'string') return fail(after, 'unavailable');
  const proposal =
    kind === 'create'
      ? { kind, after, metadata: intent.metadata }
      : kind === 'transfer'
        ? { kind, before, after, sourceId: intent.source!.id, destinationId: input.id }
        : { kind, before, after };
  return { status: 'valid' as const, proposal };
};

export const calendarDateEdit_evaluate = evaluate as <K extends Kind>(
  kind: K,
  intent: Calendar_InteractionIntent<K>,
  target: Calendar_DateTarget,
  input: Calendar_InteractionInput,
) => Calendar_InteractionEvaluation<Calendar_InteractionProposal<unknown, K>>;
