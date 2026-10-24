import type { ReactNode, ReactElement, JSX, ComponentPropsWithoutRef } from 'react';

export type Calendar_EmptyState = Record<never, never>;

// intentionally `any`: the props are spread onto arbitrary user components (as in Ark)
export type Calendar_RenderProps = Record<string, any>;

export type Calendar_RenderFn<State> = (props: Calendar_RenderProps, state: State) => ReactNode;

export type Calendar_PolymorphicProps<State = Calendar_EmptyState> = {
  /**
   * Render the part as a custom element. Pass an element to have the part's props merged into it,
   * or a function to apply the props yourself and read the part's state.
   */
  render?: ReactElement | Calendar_RenderFn<State> | undefined;
};

/** Element props for a part; the native `slot` attribute is dropped because parts use `slot` as a model prop. */
export type Calendar_HTMLProps<T extends keyof JSX.IntrinsicElements, State = Calendar_EmptyState> = Omit<
  ComponentPropsWithoutRef<T>,
  'slot'
> &
  Calendar_PolymorphicProps<State>;
