import type { Calendar_Selection } from '#features/date-selection/date-selection.types';
import { calendarEvents_normalize } from '#events/events';
import type { Calendar_InteractionProposal } from '#features/interaction/interaction.types';
import type {
  Calendar_LayoutInteractionContext,
  Calendar_LayoutLocation,
  Calendar_LayoutProjection,
} from '#layouts/interaction.types';
import type {
  Calendar_TimelinePoint,
  Calendar_TimelineLayout,
  Calendar_TimelineViewSettings,
} from '#layouts/timeline/timeline.types';
import type { LayoutCoordinates_Plan } from '#layouts/shared/coordinates';
import { layoutTimeline_build } from '#layouts/timeline/timeline';
import {
  clockTarget,
  dateProposal,
  inSurface,
  surfaceClock,
  selectionIntervals,
  matches,
} from '#layouts/shared/interaction-geometry';

type Timeline = Calendar_LayoutInteractionContext<
  Calendar_TimelineLayout<unknown, unknown>,
  Calendar_TimelineViewSettings
>;

export const layoutTimeline_locate = (
  { model, input, settings }: Timeline,
  point: Calendar_TimelinePoint,
): Calendar_LayoutLocation<'timeline'> => {
  if (!inSurface(point.fraction)) return { status: 'unavailable', reason: 'outside-surface' };
  const row = model.rows.find(row => row.key === point.surface.key);
  if (!row) return { status: 'unavailable', reason: 'unsupported-surface' };
  const dates = model.coordinates.dates.dates;
  if (!dates.length) return { status: 'unavailable', reason: 'outside-surface' };
  const index =
    point.dateKind === 'allDay' && point.edge
      ? Math.round(point.fraction * dates.length) - (point.edge === 'end' ? 1 : 0)
      : Math.min(dates.length - 1, Math.floor(point.fraction * dates.length));
  if (!dates[index]) return { status: 'unavailable', reason: 'outside-surface' };
  const date = dates[index]!;
  if (point.dateKind === 'allDay')
    return {
      status: 'valid',
      kind: 'timeline',
      target: { kind: 'allDay', at: date, resourceId: row.resource?.id },
    };
  const clock = surfaceClock(
    date,
    point.fraction * dates.length - index,
    model.coordinates,
    settings.slotMinutes ?? 60,
  );
  return clockTarget('timeline', clock, input.timeZone, row.resource?.id, point.offset);
};

const timelineSelection = (selected: Calendar_Selection, plan: LayoutCoordinates_Plan) => {
  const parts = selectionIntervals(selected, plan);
  if (!parts.length) return [];
  const count = plan.dates.dates.length;
  const start = Math.min(...parts.map(part => (part.dateIndex + part.position.start) / count));
  const end = Math.max(...parts.map(part => (part.dateIndex + part.position.start + part.position.span) / count));
  return [{ start, span: end - start }];
};

export const layoutTimeline_project = (
  { model, input, settings, scheduling }: Timeline,
  _original: Calendar_InteractionProposal,
): Calendar_LayoutProjection<'timeline'> => {
  const proposal = dateProposal(scheduling);
  if (!proposal) return { status: 'unavailable', reason: 'unsupported-proposal' };
  const geometry =
    proposal.kind === 'select'
      ? model.rows
          .filter(row => matches(proposal.range, row.resource?.id))
          .flatMap(row =>
            timelineSelection(proposal.range, model.coordinates).map(part => ({
              surface: `lane:${row.key}`,
              ...part,
            })),
          )
      : layoutTimeline_build({
          firstDayOfWeek: input.firstDayOfWeek,
          backgroundEvents: [],
          definition: settings,
          range: input.range,
          timeZone: input.timeZone,
          now: input.now,
          resources: input.resources,
          events: calendarEvents_normalize([proposal.after], input.timeZone),
        }).rows.flatMap(row =>
          row.segments.map(segment => ({ surface: `lane:${row.key}`, start: segment.start, span: segment.span })),
        );
  return { status: 'valid', kind: 'timeline', geometry };
};
