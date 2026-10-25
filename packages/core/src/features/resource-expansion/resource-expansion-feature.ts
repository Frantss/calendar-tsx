import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type {
  Calendar_ResourceExpansion,
  Calendar_ResourceExpansionConfig,
} from '#features/resource-expansion/resource-expansion.types';

const expanded = (state: Calendar_ResourceExpansion, id: string, initiallyExpanded: boolean) =>
  Object.hasOwn(state, id) ? state[id]! : initiallyExpanded;

export const resourceExpansionFeature = (config: Calendar_ResourceExpansionConfig = {}) =>
  ({
    '~id': 'resourceExpansionFeature',
    '~config': config,
    getInitialState: () => ({ resourceExpansion: {} as Calendar_ResourceExpansion }),
    resources: {
      deps: context => [context.getState('resourceExpansion')],
      run: (nodes, context) => {
        const state = context.getState<Calendar_ResourceExpansion>('resourceExpansion');
        return nodes.map(node => ({
          ...node,
          isExpanded: node.hasChildren && expanded(state, node.resource.id, context.config.initiallyExpanded ?? true),
        }));
      },
    },
    constructApi(context) {
      const setExpanded = (id: string, value?: boolean) => {
        const node = context.layout.input.resourceNodes?.find(node => node.resource.id === id);
        if (!node) throw new Error(`[calendar] unknown resource "${id}"`);
        if (!node.hasChildren) return;
        const state = context.getState<Calendar_ResourceExpansion>('resourceExpansion');
        const current = expanded(state, id, context.config.initiallyExpanded ?? true);
        const nextValue = value ?? !current;
        if (current === nextValue) return;
        const next = { ...state, [id]: nextValue };
        context.setState('resourceExpansion', () => next);
        context.options.onResourceExpansionChange?.(next);
      };
      return { resourceExpansion: { setExpanded, toggle: (id: string) => setExpanded(id) } };
    },
  }) satisfies Calendar_ConfiguredFeature<'resourceExpansionFeature', Calendar_ResourceExpansionConfig>;
