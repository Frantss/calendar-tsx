import { Temporal } from 'temporal-polyfill';
import { isBuiltinProposal } from '#features/interaction/date-target';
import type { Calendar_Selection } from '#features/date-selection/date-selection.types';
import type { Calendar_InteractionProposal } from '#features/interaction/interaction.types';
import type { Calendar_LayoutLocation } from '#layouts/interaction.types';
import { layoutCoordinates_enclose, layoutCoordinates_projectTime } from '#layouts/shared/coordinates';
import type { LayoutCoordinates_Plan } from '#layouts/shared/coordinates';

export const clockTarget = <K extends 'timeGrid' | 'timeline' | 'dayGrid'>(
  kind: K,
  clock: Temporal.PlainDateTime,
  timeZone: string,
  resourceId?: string,
  offset?: string,
): Calendar_LayoutLocation<K> => {
  const earlier = clock.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
  const later = clock.toZonedDateTime(timeZone, { disambiguation: 'later' });
  const candidates = [earlier, later].filter(
    (value, index) => value.toPlainDateTime().equals(clock) && (index === 0 || !value.equals(earlier)),
  );
  if (!candidates.length) return { status: 'unavailable', reason: 'nonexistent-time', clock, candidates };
  const at = candidates.find(value => value.offset === offset) ?? candidates[0]!;
  return {
    status: 'valid',
    kind,
    target: { kind: 'timed', at, resourceId },
    clock,
    candidates,
  } as Calendar_LayoutLocation<K>;
};

export const dateProposal = (proposal: Calendar_InteractionProposal) =>
  isBuiltinProposal(proposal)
    ? proposal
    : proposal.kind === 'create' || proposal.kind === 'transfer'
      ? { kind: 'move' as const, before: proposal.after, after: proposal.after }
      : undefined;

export const inSurface = (fraction: number) => Number.isFinite(fraction) && fraction >= 0 && fraction <= 1;

export const surfaceClock = (
  date: Temporal.PlainDate,
  fraction: number,
  plan: LayoutCoordinates_Plan,
  slot: number,
) => {
  const start = Number(plan.dates.clock.start) / 60_000_000_000;
  const length = Number(plan.dates.clock.end - plan.dates.clock.start) / 60_000_000_000;
  const minutes = start + Math.min(length, Math.round((fraction * length) / slot) * slot);
  return date.toPlainDateTime().add({ minutes });
};

export const selectionIntervals = (selected: Calendar_Selection, plan: LayoutCoordinates_Plan) => {
  if (selected.kind === 'allDay')
    return plan.dates.dates.flatMap((date, dateIndex) =>
      Temporal.PlainDate.compare(date, selected.start) >= 0 && Temporal.PlainDate.compare(date, selected.end) <= 0
        ? [{ dateIndex, position: { start: 0, span: 1 } }]
        : [],
    );
  return layoutCoordinates_enclose(
    plan,
    layoutCoordinates_projectTime(
      plan,
      {
        start: selected.start.toInstant(),
        end: selected.end.toInstant(),
      },
      'selection',
    ),
  );
};

export const matches = (selected: Calendar_Selection, id?: string) =>
  !selected.resourceIds || !id || selected.resourceIds.includes(id);
