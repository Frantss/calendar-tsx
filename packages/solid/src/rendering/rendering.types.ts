import type { Accessor, JSX, ComponentProps } from 'solid-js';

export type Calendar_EmptyState = Record<never, never>;

// intentionally `any`: the props are spread onto arbitrary user elements (as in Ark)
export type Calendar_RenderProps = Record<string, any>;

/** Returns the part's props merged with yours, so handlers chain instead of overwriting each other. */
export type Calendar_PropsFn = (userProps?: Calendar_RenderProps) => Calendar_RenderProps;

export type Calendar_RenderFn<State> = (props: Calendar_PropsFn, state: Accessor<State>) => JSX.Element;

export type Calendar_PolymorphicProps<State = Calendar_EmptyState> = {
  /**
   * Render the part as a custom element. Spread `props()` onto it, passing your own props to merge
   * them rather than overwrite them; the part's state arrives as an accessor.
   */
  render?: Calendar_RenderFn<State> | undefined;
};

export type ElementType = keyof JSX.IntrinsicElements;

/** Element props for a part; the native `slot` attribute is dropped because parts use `slot` as a model prop. */
export type Calendar_HTMLProps<T extends ElementType, State = Calendar_EmptyState> = Omit<ComponentProps<T>, 'slot'> &
  Calendar_PolymorphicProps<State>;
