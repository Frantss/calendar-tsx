import { Temporal } from 'temporal-polyfill';
import type {
  Calendar_Range,
  Calendar_TimeGridLayout,
  Calendar_TimelineLayout,
  Calendar_LayoutInput,
  Calendar_TimeGridViewSettings,
  Calendar_TimelineViewSettings,
} from '../../../src/calendar.types';
import { timeGridLayout, timelineLayout } from '../../../src/calendar-layouts';
import { layoutAxis_create, layoutAxis_date } from '../../../src/layout/layout-axis';
import { resolveClockTarget, type Evaluation, type Proposal, type Target } from '../runtime';

export type Model = Calendar_TimeGridLayout<unknown, unknown> | Calendar_TimelineLayout<unknown, unknown>;
export type Surface = { kind: 'column'; key: string } | { kind: 'lane'; key: string } | { kind: 'allDay' };
export const surfaceKey = (surface: Surface) =>
  surface.kind === 'allDay' ? 'allDay' : `${surface.kind}:${surface.key}`;
export type Preview = { surface: string; start: number; span: number; inlineStart?: number; inlineSize?: number };
export type Geometry = {
  model: Model;
  range: Calendar_Range;
  input: Calendar_LayoutInput<unknown, unknown>;
  settings: Calendar_TimeGridViewSettings & Calendar_TimelineViewSettings;
};
export type Located = Evaluation<Target> & { clock?: Temporal.PlainDateTime; resourceId?: string };

export const locate = (
  geometry: Geometry,
  surface: Surface,
  fraction: number,
  kind: Target['kind'] = 'timed',
  offset?: string,
): Located => {
  const { model, range, input, settings } = geometry;
  if (fraction < 0 || fraction > 1) return { status: 'unavailable', reason: 'outside-surface' };
  if (surface.kind === 'allDay' && model.kind === 'timeGrid') {
    const column = model.columns[Math.min(model.columns.length - 1, Math.floor(fraction * model.columns.length))];
    return column
      ? { status: 'valid', proposal: { kind: 'allDay', at: column.date, resourceId: column.resource?.id } }
      : { status: 'unavailable', reason: 'missing-column' };
  }
  const column =
    model.kind === 'timeGrid' && surface.kind === 'column'
      ? model.columns.find(column => column.key === surface.key)
      : undefined;
  const row =
    model.kind === 'timeline' && surface.kind === 'lane' ? model.rows.find(row => row.key === surface.key) : undefined;
  if (!column && !row) return { status: 'unavailable', reason: 'unsupported-surface' };
  const days = column ? 1 : range.start.until(range.end).days + 1;
  const minutes = Math.round((fraction * days * 1440) / (settings.slotMinutes ?? 30)) * (settings.slotMinutes ?? 30);
  const local = (column?.date ?? range.start).toPlainDateTime().add({ minutes });
  const resourceId = column?.resource?.id ?? row?.resource?.id;
  if (kind === 'allDay') return { status: 'valid', proposal: { kind, at: local.toPlainDate(), resourceId } };
  const result = resolveClockTarget(local.toString(), input.timeZone, offset);
  return result.status === 'valid'
    ? { status: 'valid', proposal: { ...result.proposal, resourceId }, clock: local, resourceId }
    : { ...result, clock: local, resourceId };
};

export const project = (geometry: Geometry, proposal: Proposal): Preview[] => {
  const { model, input, settings, range } = geometry;
  if (proposal.kind === 'move') {
    const after =
      proposal.after.kind === 'timed'
        ? {
            ...proposal.after,
            start: proposal.after.start.withTimeZone(input.timeZone),
            end: proposal.after.end.withTimeZone(input.timeZone),
          }
        : proposal.after;
    const previewInput = { ...input, events: [after], backgroundEvents: [] };
    if (model.kind === 'timeGrid') {
      const preview = timeGridLayout.build(previewInput, settings) as Calendar_TimeGridLayout<unknown, unknown>;
      return [
        ...preview.columns.flatMap(column =>
          column.segments.map(segment => ({
            surface: `column:${column.key}`,
            start: segment.start,
            span: segment.span,
          })),
        ),
        ...(preview.allDay?.segments.map(segment => ({
          surface: 'allDay',
          start: segment.colStart / preview.columns.length,
          span: segment.colSpan / preview.columns.length,
        })) ?? []),
      ];
    }
    const preview = timelineLayout.build(previewInput, settings) as Calendar_TimelineLayout<unknown, unknown>;
    return preview.rows.flatMap(row =>
      row.segments.map(segment => ({ surface: `lane:${row.key}`, start: segment.start, span: segment.span })),
    );
  }
  const selected = proposal.range;
  const matches = (id?: string) => !selected.resourceIds || !id || selected.resourceIds.includes(id);
  const interval = (axis: ReturnType<typeof layoutAxis_create>) => {
    const startMs = selected.kind === 'timed' ? selected.start.epochMilliseconds : layoutAxis_date(selected.start);
    const endMs =
      selected.kind === 'timed' ? selected.end.epochMilliseconds : layoutAxis_date(selected.end.add({ days: 1 }));
    const bounds = selected.kind === 'timed' ? axis.range : axis;
    if (endMs <= bounds.startMs || startMs >= bounds.endMs) return [];
    const clipped = { startMs: Math.max(startMs, bounds.startMs), endMs: Math.min(endMs, bounds.endMs) };
    const projected = selected.kind === 'timed' ? axis.project(clipped) : clipped;
    return [
      {
        start: axis.fraction(projected.startMs),
        span: (projected.endMs - projected.startMs) / (axis.endMs - axis.startMs),
      },
    ];
  };
  if (model.kind === 'timeline') {
    const axis = layoutAxis_create(range, input.timeZone);
    return model.rows
      .filter(row => matches(row.resource?.id))
      .flatMap(row => interval(axis).map(part => ({ surface: `lane:${row.key}`, ...part })));
  }
  if (selected.kind === 'allDay')
    return model.columns.flatMap((column, index) =>
      matches(column.resource?.id) &&
      Temporal.PlainDate.compare(column.date, selected.start) >= 0 &&
      Temporal.PlainDate.compare(column.date, selected.end) <= 0
        ? [{ surface: 'allDay', start: index / model.columns.length, span: 1 / model.columns.length }]
        : [],
    );
  return model.columns
    .filter(column => matches(column.resource?.id))
    .flatMap(column =>
      interval(layoutAxis_create({ start: column.date, end: column.date }, input.timeZone)).map(part => ({
        surface: `column:${column.key}`,
        ...part,
      })),
    );
};
