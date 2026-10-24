import { Temporal } from 'temporal-polyfill';
import { isBuiltinProposal } from '#calendar-editing';
import type { Calendar_Selection } from '#calendar-editing';
import { calendarEvents_normalize } from '#events/events';
import type { Calendar_InteractionProposal } from '#calendar-interaction.types';
import type {
  Calendar_DatePreview,
  Calendar_LayoutInteractionContext,
  Calendar_LayoutLocation,
  Calendar_LayoutProjection,
  Calendar_TimeGridPoint,
  Calendar_TimelinePoint,
} from '#calendar-layout-interaction.types';
import type { Calendar_TimeGridLayout, Calendar_TimeGridViewSettings } from '#layouts/time-grid/time-grid.types';
import type { Calendar_TimelineLayout, Calendar_TimelineViewSettings } from '#layouts/timeline/timeline.types';
import { layoutCoordinates_enclose, layoutCoordinates_projectTime } from '#layouts/shared/coordinates';
import type { LayoutCoordinates_Plan } from '#layouts/shared/coordinates';
import { layoutDayGrid_build } from '#layouts/day-grid/day-grid';
import { layoutTimeGrid_build } from '#layouts/time-grid/time-grid';
import { layoutTimeline_build } from '#layouts/timeline/timeline';

type Grid = Calendar_LayoutInteractionContext<Calendar_TimeGridLayout<unknown, unknown>, Calendar_TimeGridViewSettings>;
type Timeline = Calendar_LayoutInteractionContext<
  Calendar_TimelineLayout<unknown, unknown>,
  Calendar_TimelineViewSettings
>;

const clockTarget = <K extends 'timeGrid' | 'timeline' | 'dayGrid'>(
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
const dateProposal = (proposal: Calendar_InteractionProposal) =>
  isBuiltinProposal(proposal)
    ? proposal
    : proposal.kind === 'create' || proposal.kind === 'transfer'
      ? { kind: 'move' as const, before: proposal.after, after: proposal.after }
      : undefined;
const inSurface = (fraction: number) => Number.isFinite(fraction) && fraction >= 0 && fraction <= 1;

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

const surfaceClock = (date: Temporal.PlainDate, fraction: number, plan: LayoutCoordinates_Plan, slot: number) => {
  const start = Number(plan.dates.clock.start) / 60_000_000_000;
  const length = Number(plan.dates.clock.end - plan.dates.clock.start) / 60_000_000_000;
  const minutes = start + Math.min(length, Math.round((fraction * length) / slot) * slot);
  return date.toPlainDateTime().add({ minutes });
};
const selectionIntervals = (selected: Calendar_Selection, plan: LayoutCoordinates_Plan) => {
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
const timelineSelection = (selected: Calendar_Selection, plan: LayoutCoordinates_Plan) => {
  const parts = selectionIntervals(selected, plan);
  if (!parts.length) return [];
  const count = plan.dates.dates.length;
  const start = Math.min(...parts.map(part => (part.dateIndex + part.position.start) / count));
  const end = Math.max(...parts.map(part => (part.dateIndex + part.position.start + part.position.span) / count));
  return [{ start, span: end - start }];
};
const matches = (selected: Calendar_Selection, id?: string) =>
  !selected.resourceIds || !id || selected.resourceIds.includes(id);

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

export const layoutTimeline_project = (
  { model, input, settings }: Timeline,
  original: Calendar_InteractionProposal,
): Calendar_LayoutProjection<'timeline'> => {
  const proposal = dateProposal(original);
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

type DayGrid = Calendar_LayoutInteractionContext<
  import('#layouts/day-grid/day-grid.types').Calendar_DayGridLayout<unknown, unknown>,
  import('#layouts/day-grid/day-grid.types').Calendar_DayGridViewSettings
>;
export const layoutDayGrid_locate = (
  { model, input }: DayGrid,
  point: import('#calendar-layout-interaction.types').Calendar_DayGridPoint,
): Calendar_LayoutLocation<'dayGrid'> => {
  if (!inSurface(point.fraction)) return { status: 'unavailable', reason: 'outside-surface' };
  const row = model.sections
    .find(section => section.key === point.surface.section)
    ?.rows.find(row => row.key === point.surface.row);
  if (!row) return { status: 'unavailable', reason: 'missing-row' };
  const index = point.edge
    ? Math.round(point.fraction * row.days.length) - (point.edge === 'end' ? 1 : 0)
    : Math.min(row.days.length - 1, Math.floor(point.fraction * row.days.length));
  const day = row.days[index];
  if (!day) return { status: 'unavailable', reason: 'outside-surface' };
  if (point.dateKind === 'timed')
    return clockTarget(
      'dayGrid',
      (point.edge === 'end' && Temporal.PlainTime.from(point.time ?? '00:00').equals('00:00')
        ? day.date.add({ days: 1 })
        : day.date
      ).toPlainDateTime(point.time ?? '00:00'),
      input.timeZone,
      day.resource?.id,
      point.offset,
    );
  return { status: 'valid', kind: 'dayGrid', target: { kind: 'allDay', at: day.date, resourceId: day.resource?.id } };
};
export const layoutDayGrid_project = (
  { model, input, settings }: DayGrid,
  original: Calendar_InteractionProposal,
): Calendar_LayoutProjection<'dayGrid'> => {
  const proposal = dateProposal(original);
  if (!proposal) return { status: 'unavailable', reason: 'unsupported-proposal' };
  if (proposal.kind === 'select') {
    const selected = proposal.range;
    const start =
      selected.kind === 'timed' ? selected.start.withTimeZone(input.timeZone).toPlainDate() : selected.start;
    const end =
      selected.kind === 'timed'
        ? selected.end.subtract({ nanoseconds: 1 }).withTimeZone(input.timeZone).toPlainDate()
        : selected.end;
    return {
      status: 'valid',
      kind: 'dayGrid',
      geometry: model.sections.flatMap(section =>
        section.rows.flatMap(row =>
          row.days.flatMap((day, index) =>
            matches(selected, day.resource?.id) &&
            Temporal.PlainDate.compare(day.date, start) >= 0 &&
            Temporal.PlainDate.compare(day.date, end) <= 0
              ? [
                  {
                    surface: `row:${section.key}:${row.key}`,
                    start: index / row.columnCount,
                    span: 1 / row.columnCount,
                  },
                ]
              : [],
          ),
        ),
      ),
    };
  }
  const preview = layoutDayGrid_build({
    ...input,
    definition: settings,
    today: input.now.toPlainDate(),
    events: calendarEvents_normalize([proposal.after], input.timeZone),
    backgroundEvents: [],
  });
  return {
    status: 'valid',
    kind: 'dayGrid',
    geometry: preview.sections.flatMap(section =>
      section.rows.flatMap(row =>
        row.segments.map(segment => ({
          surface: `row:${section.key}:${row.key}`,
          start: segment.colStart / row.columnCount,
          span: segment.colSpan / row.columnCount,
        })),
      ),
    ),
  };
};
