import { createContext, useContext } from 'solid-js';

export { Show, splitProps, onCleanup, untrack } from 'solid-js';
export { Dynamic } from 'solid-js/web';
export type { Accessor, JSX, ComponentProps, ValidComponent } from 'solid-js';

export const calendarContext_create = <T>() => {
  const context = createContext<T>();
  return { Provider: context.Provider, use: () => useContext(context) };
};
