import { Temporal } from 'temporal-polyfill';
import { calendarEvents_normalize } from '#events/events';
import type { Calendar_InteractionProposal } from '#features/interaction/interaction.types';
import type {
  Calendar_DatePreview,
  Calendar_LayoutInteractionContext,
  Calendar_LayoutLocation,
  Calendar_LayoutProjection,
} from '#layouts/interaction.types';
import type {
  Calendar_TimeGridPoint,
  Calendar_TimeGridLayout,
  Calendar_TimeGridViewSettings,
} from '#layouts/time-grid/time-grid.types';
import { layoutTimeGrid_build } from '#layouts/time-grid/time-grid';
import {
  clockTarget,
  dateProposal,
  inSurface,
  surfaceClock,
  selectionIntervals,
  matches,
} from '#layouts/shared/interaction-geometry';

type Grid = Calendar_LayoutInteractionContext<Calendar_TimeGridLayout<unknown, unknown>, Calendar_TimeGridViewSettings>;

export const layoutTimeGrid_locate = (
  { model, input, settings }: Grid,
  point: Calendar_TimeGridPoint,
): Calendar_LayoutLocation<'timeGrid'> => {
  if (!inSurface(point.fraction)) return { status: 'unavailable', reason: 'outside-surface' };
  if (point.surface.kind === 'allDay') {
    if (!model.allDay) return { status: 'unavailable', reason: 'unsupported-surface' };
    const index = point.edge
      ? Math.round(point.fraction * model.columns.length) - (point.edge === 'end' ? 1 : 0)
      : Math.min(model.columns.length - 1, Math.floor(point.fraction * model.columns.length));
    const column = model.columns[index];
    return column
      ? {
          status: 'valid',
          kind: 'timeGrid',
          target: { kind: 'allDay', at: column.date, resourceId: column.resource?.id },
        }
      : { status: 'unavailable', reason: 'missing-column' };
  }
  const key = point.surface.key;
  const column = model.columns.find(column => column.key === key);
  if (!column || point.dateKind === 'allDay') return { status: 'unavailable', reason: 'unsupported-surface' };
  const clock = surfaceClock(column.date, point.fraction, model.coordinates, settings.slotMinutes ?? 30);
  return clockTarget('timeGrid', clock, input.timeZone, column.resource?.id, point.offset);
};

export const layoutTimeGrid_project = (
  { model, input, settings }: Grid,
  original: Calendar_InteractionProposal,
): Calendar_LayoutProjection<'timeGrid'> => {
  const proposal = dateProposal(original);
  if (!proposal) return { status: 'unavailable', reason: 'unsupported-proposal' };
  let geometry: Calendar_DatePreview[];
  if (proposal.kind === 'select') {
    const selected = proposal.range;
    geometry =
      selected.kind === 'allDay'
        ? model.allDay
          ? model.columns.flatMap((column, index) =>
              matches(selected, column.resource?.id) &&
              Temporal.PlainDate.compare(column.date, selected.start) >= 0 &&
              Temporal.PlainDate.compare(column.date, selected.end) <= 0
                ? [{ surface: 'allDay', start: index / model.columns.length, span: 1 / model.columns.length }]
                : [],
            )
          : []
        : model.columns
            .filter(column => matches(selected, column.resource?.id))
            .flatMap(column =>
              selectionIntervals(selected, model.coordinates)
                .filter(part => model.coordinates.dates.dates[part.dateIndex]!.equals(column.date))
                .map(part => ({ surface: `column:${column.key}`, ...part.position })),
            );
  } else {
    const preview = layoutTimeGrid_build({
      firstDayOfWeek: input.firstDayOfWeek,
      definition: settings,
      range: input.range,
      timeZone: input.timeZone,
      now: input.now,
      resources: input.resources,
      events: calendarEvents_normalize([proposal.after], input.timeZone),
      backgroundEvents: [],
    });
    geometry = [
      ...preview.columns.flatMap(column =>
        column.segments.map(segment => ({
          surface: `column:${column.key}`,
          start: segment.start,
          span: segment.span,
          inlineStart: segment.inlineStart,
          inlineSize: segment.inlineSize,
        })),
      ),
      ...(preview.allDay?.segments.map(segment => ({
        surface: 'allDay',
        start: segment.colStart / preview.columns.length,
        span: segment.colSpan / preview.columns.length,
      })) ?? []),
    ];
  }
  return { status: 'valid', kind: 'timeGrid', geometry };
};
