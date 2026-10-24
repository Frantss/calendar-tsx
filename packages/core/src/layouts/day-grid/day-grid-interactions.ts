import { Temporal } from 'temporal-polyfill';
import { calendarEvents_normalize } from '#events/events';
import type { Calendar_InteractionProposal } from '#features/interaction/interaction.types';
import type {
  Calendar_LayoutInteractionContext,
  Calendar_LayoutLocation,
  Calendar_LayoutProjection,
} from '#layouts/interaction.types';
import { layoutDayGrid_build } from '#layouts/day-grid/day-grid';
import { clockTarget, dateProposal, inSurface, matches } from '#layouts/shared/interaction-geometry';

type DayGrid = Calendar_LayoutInteractionContext<
  import('#layouts/day-grid/day-grid.types').Calendar_DayGridLayout<unknown, unknown>,
  import('#layouts/day-grid/day-grid.types').Calendar_DayGridViewSettings
>;

export const layoutDayGrid_locate = (
  { model, input }: DayGrid,
  point: import('#layouts/day-grid/day-grid.types').Calendar_DayGridPoint,
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
  { model, input, settings, scheduling }: DayGrid,
  _original: Calendar_InteractionProposal,
): Calendar_LayoutProjection<'dayGrid'> => {
  const proposal = dateProposal(scheduling);
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
