import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';

import { calendarClock_interval } from '#calendar-clock';
import { calendarEvents_defaultOrder, calendarEvents_normalize, calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_step, calendar_navigation } from '#calendar-navigation';
import type {
  Calendar_Api,
  Calendar_Instance,
  Calendar_Layout,
  Calendar_NavigateTarget,
  Calendar_Options,
  Calendar_State,
  Calendar_ViewContext,
  Calendar_Views,
} from '#calendar.types';
import { layoutList_build } from '#layout/layout-list';
import { layoutMonth_build } from '#layout/layout-month';
import { layoutTimeGrid_build } from '#layout/layout-time-grid';

const defaultClock = calendarClock_interval({ every: Temporal.Duration.from({ minutes: 1 }) });

/** Inputs the layout depends on; everything else on the options is read untracked (D24). */
type Tracked<TData, TResourceData, TViews extends Calendar_Views> = Pick<
  Calendar_Options<TData, TResourceData, TViews>,
  'timeZone' | 'views' | 'view' | 'date' | 'events' | 'resources' | 'firstDayOfWeek'
> & { now: Temporal.Instant };

const tracked_from = <TData, TResourceData, TViews extends Calendar_Views>(
  options: Calendar_Options<TData, TResourceData, TViews>,
  now: Temporal.Instant,
): Tracked<TData, TResourceData, TViews> => ({
  timeZone: options.timeZone,
  views: options.views,
  view: options.view,
  date: options.date,
  events: options.events,
  resources: options.resources,
  firstDayOfWeek: options.firstDayOfWeek,
  now,
});

const tracked_equals = <TData, TResourceData, TViews extends Calendar_Views>(
  a: Tracked<TData, TResourceData, TViews>,
  b: Tracked<TData, TResourceData, TViews>,
) =>
  a.timeZone === b.timeZone &&
  a.views === b.views &&
  a.view === b.view &&
  a.date.equals(b.date) &&
  a.events === b.events &&
  a.resources === b.resources &&
  a.firstDayOfWeek === b.firstDayOfWeek &&
  a.now.equals(b.now);

export const calendar_create = <TData, TResourceData = unknown, TViews extends Calendar_Views = Calendar_Views>(
  initial: Calendar_Options<TData, TResourceData, TViews>,
): Calendar_Instance<TData, TResourceData, TViews> => {
  let options = initial;
  const clock = () => options.clock ?? defaultClock;

  const persisted = createStore(tracked_from(initial, initial.initialNow ?? clock().now()));

  const store = createStore((): Calendar_State<TData, TResourceData, TViews> => {
    const input = persisted.state;
    const now = input.now.toZonedDateTimeISO(input.timeZone);
    const definition = input.views[input.view];

    if (!definition) throw new Error(`[calendar] unknown view "${input.view}"`);

    const navigation = calendar_navigation(input.views, input.view, input.date, input);
    const context: Calendar_ViewContext<TViews> = { ...navigation, kind: definition.kind };
    const order = options.eventOrder;
    const events = calendarEvents_normalize(input.events, input.timeZone)
      .filter(event => calendarEvents_overlaps(event, context.range))
      .sort((a, b) => (order ? order(a, b, context) : calendarEvents_defaultOrder(a, b)));

    const layout: Calendar_Layout<TData, TResourceData> =
      definition.kind === 'month'
        ? layoutMonth_build({
            definition,
            range: context.range,
            period: context.period,
            events,
            today: now.toPlainDate(),
          })
        : definition.kind === 'timeGrid'
          ? layoutTimeGrid_build({
              definition,
              range: context.range,
              events,
              resources: input.resources ?? [],
              timeZone: input.timeZone,
              now,
            })
          : layoutList_build({ range: context.range, events });

    return { context, layout, now };
  });

  const navigate = (target: Calendar_NavigateTarget<TViews>) => {
    options.onNavigate(
      calendar_navigation(options.views, target.view ?? options.view, target.date ?? options.date, options),
    );
  };

  const step = (direction: 1 | -1) => {
    const definition = options.views[options.view];

    if (!definition) throw new Error(`[calendar] unknown view "${options.view}"`);

    navigate({ date: calendarNavigation_step(definition, options.date, direction) });
  };

  const api: Calendar_Api<TViews> = {
    next: () => step(1),
    prev: () => step(-1),
    today: () => navigate({ date: clock().now().toZonedDateTimeISO(options.timeZone).toPlainDate() }),
    goTo: date => navigate({ date }),
    setView: (view, date) => navigate({ view, date }),
    navigate,
  };

  const tick = () =>
    persisted.setState(state => {
      const next = { ...state, now: clock().now() };

      return tracked_equals(state, next) ? state : next;
    });

  return {
    get options() {
      return options;
    },
    store,
    api,
    '~mount': () => {
      tick();

      return clock().subscribe(tick);
    },
    '~update': next => {
      options = next;
      persisted.setState(state => {
        const updated = tracked_from(next, state.now);

        return tracked_equals(state, updated) ? state : updated;
      });
    },
  };
};
