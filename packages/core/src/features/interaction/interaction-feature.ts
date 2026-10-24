import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_InteractionOwnership } from '#features/interaction/interaction.types';
import { calendarInteractions_create } from '#features/interaction/interaction-runtime';

export const interactionFeature = (config: {} = {}) =>
  ({
    '~id': 'interactionFeature',
    '~config': config,
    constructApi(context) {
      const configured = context.options.interactionOwnership;
      const currentOwnership = () => context.options.interactionOwnership;
      const ownership: Calendar_InteractionOwnership | undefined =
        configured?.mode === 'controlled'
          ? {
              mode: 'controlled',
              read: () => {
                const current = currentOwnership();
                return current?.mode === 'controlled' ? current.read() : configured.read();
              },
              onChange: next => {
                const current = currentOwnership();
                if (current?.mode === 'controlled') current.onChange(next);
              },
            }
          : configured;
      const runtime = calendarInteractions_create({
        features: context.features,
        read: () => ({
          ...context.options,
          ...Object.fromEntries(
            Object.values(context.features).flatMap(feature => {
              const key = feature.interaction?.settings;
              return key ? [[key, context.settings(key, {})]] : [];
            }),
          ),
        }),
        layout: () => context.layout,
        ownership,
        emit: (proposal, intent) => runtime.dispatch(proposal, context, intent),
      });
      context.onOptionsChange(() => {
        const next = currentOwnership();
        if (
          (next?.mode ?? 'internal') !== (configured?.mode ?? 'internal') ||
          (configured?.mode === 'external' && next?.mode === 'external' && configured.atom !== next.atom)
        )
          throw new Error('[calendar] interaction ownership mode and atom are fixed at creation');
        runtime.refresh();
      });
      context.onMount(() => {
        runtime.refresh();
        const subscription = ownership?.mode === 'external' ? ownership.atom.subscribe?.(runtime.refresh) : undefined;
        return () => {
          if (typeof subscription === 'function') subscription();
          else subscription?.unsubscribe();
          runtime.unmount();
        };
      });
      return {
        interactions: {
          store: runtime.store,
          locate: runtime.locate,
          project: runtime.project,
          refresh: runtime.refresh,
        },
        ...runtime.bind(context),
      };
    },
  }) as const satisfies Calendar_ConfiguredFeature;
