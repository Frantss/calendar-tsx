import { createContext, omit, useContext } from 'solid-js';

export { Show, onCleanup, untrack } from 'solid-js';
export { Dynamic } from '@solidjs/web';
export type { Accessor } from 'solid-js';
export type { JSX, ComponentProps, ValidComponent } from '@solidjs/web';

export const splitProps = <T extends object, K extends readonly (keyof T)[]>(props: T, keys: K) =>
  [props as Pick<T, K[number]>, omit(props, ...keys)] as const;

export const calendarContext_create = <T>() => {
  const context = createContext<T | null>(null);
  return { Provider: context, use: () => useContext(context) };
};
