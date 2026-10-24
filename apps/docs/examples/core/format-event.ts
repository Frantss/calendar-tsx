import type { Calendar_Event } from '@calendar-tsx/core';

export const formatEvent = (event: Calendar_Event<{ title: string }>, locale = 'en-US') => {
  if (event.kind === 'allDay')
    return `${event.data.title}, all day, ${event.start.toLocaleString(locale, { dateStyle: 'medium' })} to ${(event.end ?? event.start).toLocaleString(locale, { dateStyle: 'medium' })}`;

  const options = { dateStyle: 'medium', timeStyle: 'short' } as const;
  return `${event.data.title}, ${event.start.toLocaleString(locale, options)} to ${event.end.toLocaleString(locale, options)}`;
};
