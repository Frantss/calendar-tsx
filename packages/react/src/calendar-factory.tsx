// Port of Ark v6's `ark` factory (chakra-ui/ark, branch v6, packages/react/src/components/factory.ts)
// without `asChild` and without `@zag-js/core`'s `mergeProps` (D25).
import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  ElementType,
  ForwardRefExoticComponent,
  JSX,
  ReactElement,
  ReactNode,
  Ref,
  RefCallback,
} from 'react';
import { cloneElement, createElement, forwardRef, isValidElement, memo, useCallback } from 'react';

type AnyProps = Record<string, any>;

const isHandler = (key: string, value: unknown) => /^on[A-Z]/.test(key) && typeof value === 'function';

/**
 * Same contract as Zag's `mergeProps`: later sources win, except event handlers (called in source
 * order), `className` (joined) and `style` (shallow-merged).
 */
export const calendarProps_merge = (...sources: (AnyProps | undefined)[]): AnyProps => {
  const result: AnyProps = {};

  for (const source of sources) {
    if (!source) continue;

    for (const [key, value] of Object.entries(source)) {
      const previous = result[key];

      if (value === undefined) {
        if (!(key in result)) result[key] = value;
        continue;
      }

      if (isHandler(key, value) && typeof previous === 'function') {
        result[key] = (...args: unknown[]) => {
          previous(...args);
          value(...args);
        };
      } else if (key === 'className' && typeof previous === 'string') {
        result[key] = `${previous} ${value}`.trim();
      } else if (key === 'style' && typeof previous === 'object' && typeof value === 'object') {
        result[key] = { ...previous, ...value };
      } else {
        result[key] = value;
      }
    }
  }

  return result;
};

type PossibleRef<T> = Ref<T | null> | undefined;

const composeRefs =
  <T,>(...refs: PossibleRef<T>[]): RefCallback<T> =>
  node => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };

// eslint-disable-next-line react-hooks/exhaustive-deps -- the refs are the dependency list
const useComposedRefs = <T,>(...refs: PossibleRef<T>[]) => useCallback(composeRefs(...refs), refs);

// Credits to the Radix team (via Ark): React 18 and 19 expose an element's ref in different places.
const getRef = (element: ReactElement): Ref<unknown> | undefined => {
  let getter = Object.getOwnPropertyDescriptor(element.props, 'ref')?.get;
  let mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning;

  if (mayWarn) return (element as { ref?: Ref<unknown> }).ref;

  getter = Object.getOwnPropertyDescriptor(element, 'ref')?.get;
  mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning;

  if (mayWarn) return (element.props as { ref?: Ref<unknown> }).ref;

  return (element.props as { ref?: Ref<unknown> }).ref || (element as { ref?: Ref<unknown> }).ref;
};

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

type FactoryProps = Calendar_PolymorphicProps<any> & {
  children?: ReactNode | undefined;
  /** The part's state, forwarded to the `render` function. Set by the part, not the consumer. */
  state?: unknown;
};

type FactoryComponent<E extends ElementType> = ForwardRefExoticComponent<ComponentPropsWithRef<E> & FactoryProps>;
type FactoryElements = { [E in keyof JSX.IntrinsicElements]: FactoryComponent<E> };

const EMPTY_STATE: Calendar_EmptyState = Object.freeze({});

const withRender = (Component: ElementType) => {
  const Comp = memo(
    forwardRef<unknown, FactoryProps & AnyProps>((props, ref) => {
      const { render, state, children, ...restProps } = props;

      const rendered = typeof render === 'function' ? render({ ...restProps, children }, state ?? EMPTY_STATE) : render;
      const onlyChild = render && isValidElement<AnyProps>(rendered) ? rendered : undefined;
      const childRef = onlyChild ? getRef(onlyChild) : undefined;
      const composedRef = useComposedRefs(ref, childRef);

      if (!render) return createElement(Component, { ...restProps, ref }, children);

      // a render function is free to return a fragment, a string or nothing at all
      if (!onlyChild) return typeof render === 'function' ? (rendered as ReactElement | null) : null;

      // a render function receives the props and applies them itself, so only the ref is left to compose
      const nextProps =
        typeof render === 'function' ? {} : calendarProps_merge({ ...restProps, children }, onlyChild.props);

      // eslint-disable-next-line react-x/no-clone-element -- the element form of `render` is defined as merging into the given element
      return cloneElement(onlyChild, { ...nextProps, ref: ref ? composedRef : childRef });
    }),
  );

  Comp.displayName = typeof Component === 'string' ? `calendar.${Component}` : 'calendar';

  return Comp;
};

/** Element props for a part; the native `slot` attribute is dropped because parts use `slot` as a model prop. */
export type Calendar_HTMLProps<T extends keyof JSX.IntrinsicElements, State = Calendar_EmptyState> = Omit<
  ComponentPropsWithoutRef<T>,
  'slot'
> &
  Calendar_PolymorphicProps<State>;

const cache = new Map<ElementType, ReturnType<typeof withRender>>();

/** `calendarFactory_elements.div`, `.button`, …: unstyled elements with `render` support, one memoised component per tag. */
export const calendarFactory_elements = new Proxy({} as FactoryElements, {
  get: (_, element) => {
    const tag = element as ElementType;

    if (!cache.has(tag)) cache.set(tag, withRender(tag));

    return cache.get(tag);
  },
});
