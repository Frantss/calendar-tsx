import {
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEmpty,
  ListViewEvent,
  ListViewSection,
  ListViewSectionHeader,
} from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';

// #region view
export const Agenda = () => {
  const list = useLayout('list');

  return (
    <Show when={list()}>
      {list => (
        <ListView model={list()}>
          <For each={list().sections}>
            {section => (
              <ListViewSection
                section={section}
                aria-label={section.resource?.title ?? section.date?.toLocaleString('en-US', { dateStyle: 'full' })}
              >
                <Show when={section.resource || section.date}>
                  <ListViewSectionHeader section={section}>
                    {section.resource?.title ?? section.date?.toLocaleString('en-US', { dateStyle: 'full' })}
                  </ListViewSectionHeader>
                </Show>
                <For each={section.days}>
                  {day => (
                    <ListViewDay day={day}>
                      <ListViewDayHeader
                        day={day}
                        aria-label={
                          section.date ? day.resource?.title : day.date.toLocaleString('en-US', { dateStyle: 'full' })
                        }
                      >
                        <Show when={!section.date} fallback={day.resource?.title}>
                          <time dateTime={day.date.toString()}>
                            <strong>{day.date.toLocaleString('en-US', { day: 'numeric' })}</strong>{' '}
                            <span>
                              <span>{day.date.toLocaleString('en-US', { weekday: 'short' })}</span>{' '}
                              <span>{day.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</span>
                            </span>
                          </time>
                        </Show>
                      </ListViewDayHeader>
                      <For each={day.events}>
                        {event => <ListViewEvent event={event}>{event.data.title}</ListViewEvent>}
                      </For>
                    </ListViewDay>
                  )}
                </For>
              </ListViewSection>
            )}
          </For>
          <ListViewEmpty>No events this week</ListViewEmpty>
        </ListView>
      )}
    </Show>
  );
};
// #endregion view
