import { calendarFeatures_active } from '#features/calendar-features';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import { isDateTarget, calendarDateTarget_equal } from '#features/interaction/date-target';
import { calendarPlacement_place } from '#features/interaction/placement';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import type {
  Calendar_TransferSource,
  Calendar_CrossCalendarSettings,
} from '#features/cross-calendar/cross-calendar.types';

const transferOperation = createInteractionOperation({
  kind: 'transfer',
  enabled: input =>
    !!input.crossCalendar?.id &&
    (input.views[input.view].crossCalendar?.enabled ?? input.crossCalendar?.enabled) !== false,
  source: intent => intent.source.read(),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  create(intent, target, input) {
    const before = intent.source.read();
    if (!before) return { status: 'unavailable', reason: 'source-changed' };
    const settings = { ...input.crossCalendar, ...input.views[input.view].crossCalendar };
    if (!settings.id || settings.id === intent.source.id) return { status: 'rejected', reason: 'same-calendar' };
    if (settings.accept?.(intent.source.id) === false) return { status: 'rejected', reason: 'calendar-rejected' };
    if (input.events.some(event => event.id === before.id)) return { status: 'rejected', reason: 'duplicate-event-id' };
    const after = calendarPlacement_place(before, target, settings.placement ?? {}, intent.source.sourceResourceId);
    return typeof after === 'string'
      ? { status: 'unavailable', reason: after }
      : {
          status: 'valid',
          proposal: { kind: 'transfer', before, after, sourceId: intent.source.id, destinationId: settings.id },
        };
  },
  scheduling: proposal => ({ kind: 'event', event: proposal.after }),
  api: (commands, context) => ({
    transfer: {
      prepare(eventId: string, sourceResourceId?: string): Calendar_TransferSource | undefined {
        const isActive = () =>
          calendarFeatures_active(context.features, context.view).some(([key]) => key === 'crossCalendarFeature');
        if (!isActive()) return;
        const settings = context.settings<Partial<Calendar_CrossCalendarSettings>>('crossCalendar', {});
        if (!settings.id || settings.enabled === false) return;
        const before = context.options.events.find(event => event.id === eventId);
        if (!before || before['~source']) return;
        if (
          context
            .settings<import('#features/event-move/event-move.types').Calendar_MovementSettings>('movement', {})
            .canMove?.(before) === false
        )
          return;
        const session = context.api.move?.begin(eventId, sourceResourceId);
        if (session?.status !== 'active') return;
        let released = false;
        const read = () => {
          context.api.interactions.refresh();
          if (
            released ||
            context.settings<Partial<Calendar_CrossCalendarSettings>>('crossCalendar', {}).id !== settings.id ||
            !isActive() ||
            context
              .settings<import('#features/event-move/event-move.types').Calendar_MovementSettings>('movement', {})
              .canMove?.(before) === false ||
            context.settings<Partial<Calendar_CrossCalendarSettings>>('crossCalendar', {}).enabled === false ||
            !session.session.isActive()
          )
            return;
          return context.options.events.find(event => event === before) as Calendar_EventInput<unknown> | undefined;
        };
        const release = () => {
          if (released) return;
          released = true;
          session.session.cancel('transfer-released');
        };
        return {
          session: session.session,
          id: settings.id,
          sourceResourceId,
          read,
          release,
          complete: proposal => {
            if (!read()) return;
            release();
            context.options.onEventTransfer?.(proposal);
          },
        };
      },

      begin: (source: Calendar_TransferSource) => commands.begin({ kind: 'transfer', source }),
      evaluate: (source: Calendar_TransferSource, target: Calendar_DateTarget) =>
        commands.evaluate({ kind: 'transfer', source }, target),
    },
  }),
  emit: (proposal, _context, intent) => intent.source.complete(proposal),
});

export const crossCalendarFeature = (config: Partial<Calendar_CrossCalendarSettings> = {}) =>
  ({
    '~id': 'crossCalendarFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'crossCalendar',
      operation: transferOperation,
      deps: input => [
        input.crossCalendar?.enabled,
        input.crossCalendar?.id,
        input.crossCalendar?.accept,
        input.crossCalendar?.placement,
        ...Object.values(input.views[input.view].crossCalendar ?? {}),
      ],
    },
  }) as const satisfies Calendar_ConfiguredFeature;
