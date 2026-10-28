import { Temporal } from 'temporal-polyfill';
import { calendarFeatures, calendarViews, listView } from '@calendar-tsx/core';
import { Calendar, ListView, ListViewEmpty, useCalendarSelector } from '@calendar-tsx/solid/v2';

export const ssr_subscribe = () => {
  throw new Error('SSR must not mount the clock');
};

const EmptyList = () => {
  const model = useCalendarSelector(state => state.layout);
  const list = () => {
    const layout = model();
    if (layout.kind !== 'list') throw new Error('Expected a list');
    return layout;
  };
  return (
    <ListView model={list()}>
      <ListViewEmpty>No events</ListViewEmpty>
    </ListView>
  );
};

export const SsrApp = () => (
  <Calendar
    features={{}}
    views={calendarViews({ features: calendarFeatures({}), views: { list: listView({ days: 1 }) } })}
    view='list'
    date={Temporal.PlainDate.from('2026-10-27')}
    timeZone='UTC'
    events={[]}
    onNavigate={() => {}}
    clock={{ now: () => Temporal.Instant.from('2026-10-27T12:00Z'), subscribe: ssr_subscribe }}
  >
    <EmptyList />
  </Calendar>
);
