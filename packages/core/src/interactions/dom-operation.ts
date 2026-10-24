import type { Calendar_OperationKind, Calendar_InteractionStart } from '#features/interaction/interaction.types';
import type { Calendar_DomOperation, Calendar_DomOperationSpec } from '#interactions/dom.types';
import type { DomStart, DomBinding } from '#interactions/dom.internal';

export const domStart = <K extends Calendar_OperationKind>(
  start: Calendar_InteractionStart<K>,
  accepts: Calendar_DomOperationSpec<K>['acceptsTarget'],
): DomStart =>
  start.status !== 'active'
    ? start
    : {
        status: 'active',
        session: {
          ...start.session,
          update: target =>
            accepts(target) ? start.session.update(target) : start.session.unavailable('unsupported-target'),
        },
      };

export const createCalendarDomOperation = <K extends Calendar_OperationKind>(
  spec: Calendar_DomOperationSpec<K>,
): Calendar_DomOperationSpec<K> => spec;

export const resolveDomOperation = (definition: Calendar_DomOperation): DomBinding => {
  const spec = definition as Calendar_DomOperationSpec<Calendar_OperationKind>;
  const target = (hit: unknown, anchor: unknown) =>
    spec.target ? spec.target(hit, anchor) : spec.acceptsTarget(hit) ? hit : undefined;
  return {
    begin: anchor => {
      const value = target(anchor, anchor);
      return spec.acceptsTarget(value) ? domStart(spec.begin(value), spec.acceptsTarget) : undefined;
    },
    target,
  };
};
