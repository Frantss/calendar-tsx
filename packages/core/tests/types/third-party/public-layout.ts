import type { Calendar_LayoutFeature, Calendar_View } from '@calendar-tsx/core';

type ApprovalBoard = { kind: 'approvalBoard'; cells: readonly string[] };
declare module '@calendar-tsx/core' {
  interface Calendar_Layout_FeatureMap<TData, TResourceData, TFeatures> {
    approvalBoardLayout: ApprovalBoard;
  }
  interface Calendar_LayoutInteractionMap {
    approvalBoard: {
      point: { kind: 'approvalBoard'; cell: number };
      target: boolean;
      geometry: { eventId: string; cell: number };
    };
  }
}
export const approvalBoardLayout: Calendar_LayoutFeature<'approvalBoard', {}, ApprovalBoard> = {
  kind: 'approvalBoard',
  period: date => ({ start: date, end: date }),
  range: period => period,
  step: (date, _settings, direction) => date.add({ days: direction }),
  build: input => ({ kind: 'approvalBoard', cells: input.events.map(event => event.id) }),
  locate: ({ model }, point) =>
    point.cell >= 0 && point.cell < model.cells.length
      ? { status: 'valid', kind: 'approvalBoard', target: false }
      : { status: 'unavailable', reason: 'missing-cell' },
  project: ({ model }, proposal) =>
    proposal.kind === 'approve'
      ? {
          status: 'valid',
          kind: 'approvalBoard',
          geometry: { eventId: proposal.event.id, cell: model.cells.indexOf(proposal.event.id) },
        }
      : { status: 'unavailable', reason: 'unsupported-proposal' },
};
export const approvalBoardView = {
  kind: 'approvalBoard',
  '~layout': 'approvalBoardLayout',
  '~features': { approvalBoardLayout },
} as const satisfies Calendar_View<'approvalBoardLayout'>;
