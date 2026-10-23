// Port of Ark v6's Solid `ark` factory (chakra-ui/ark, `@ark-ui/solid@6.0.0-next.0`, src/components/factory.tsx)
// without `asChild` and without `@zag-js/solid`'s `mergeProps` (D25, D31).
import type { Accessor, ComponentProps, JSX, ValidComponent } from 'solid-js';
import { splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

type AnyProps = Record<string, any>;

type PropsSource = AnyProps | (() => AnyProps | undefined) | undefined;

const isHandler = (key: string, value: unknown) =>
  (/^on[A-Z]/.test(key) || key === 'ref') && typeof value === 'function';

const resolve = (source: PropsSource) => (typeof source === 'function' ? source() : source);

const mergeValue = (key: string, previous: unknown, value: unknown) => {
  if (value === undefined) return previous;

  if (isHandler(key, value) && typeof previous === 'function') {
    return (...args: unknown[]) => {
      previous(...args);
      (value as (...args: unknown[]) => void)(...args);
    };
  }

  if (key === 'class' && typeof previous === 'string' && typeof value === 'string')
    return `${previous} ${value}`.trim();
  if (key === 'style' && typeof previous === 'object' && previous && typeof value === 'object') {
    return { ...previous, ...value };
  }

  return value;
};

/**
 * Same contract as React's `calendarProps_merge`: later sources win, except event handlers and
 * `ref` (called in source order), `class` (joined) and `style` (shallow-merged). Every key is a
 * getter and a source may be a function, so reading the result inside JSX stays reactive.
 */
export const calendarProps_merge = (...sources: PropsSource[]): AnyProps => {
  const result: AnyProps = {};

  for (const source of sources) {
    const resolved = resolve(source);

    if (!resolved) continue;

    for (const key of Object.keys(resolved)) {
      if (key in result) continue;

      Object.defineProperty(result, key, {
        enumerable: true,
        get: () => {
          let merged: unknown;

          for (const each of sources) {
            const props = resolve(each);

            if (props && key in props) merged = mergeValue(key, merged, props[key]);
          }

          return merged;
        },
      });
    }
  }

  return result;
};

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

type FactoryProps = Calendar_PolymorphicProps<any> & {
  /** The part's state, forwarded to the `render` function. Set by the part, not the consumer. */
  state?: unknown;
};

type ElementType = keyof JSX.IntrinsicElements;
type FactoryComponent<E extends ElementType> = (props: ComponentProps<E> & FactoryProps) => JSX.Element;
type FactoryElements = { [E in ElementType]: FactoryComponent<E> };

const EMPTY_STATE: Calendar_EmptyState = Object.freeze({});

const withRender = (Component: ValidComponent) => (props: FactoryProps & AnyProps) => {
  const [local, restProps] = splitProps(props, ['render', 'state']);

  // unlike Ark, `ref` stays in the props, so a part's ref reaches the rendered node through `props()`
  const propsFn: Calendar_PropsFn = userProps => calendarProps_merge(restProps, userProps);

  if (local.render) return local.render(propsFn, () => (local.state ?? EMPTY_STATE) as never);

  return <Dynamic component={Component} {...restProps} />;
};

/** Element props for a part; the native `slot` attribute is dropped because parts use `slot` as a model prop. */
export type Calendar_HTMLProps<T extends ElementType, State = Calendar_EmptyState> = Omit<ComponentProps<T>, 'slot'> &
  Calendar_PolymorphicProps<State>;

const cache = new Map<ValidComponent, ReturnType<typeof withRender>>();

/** `calendarFactory_elements.div`, `.button`, …: unstyled elements with `render` support, one component per tag. */
export const calendarFactory_elements = new Proxy({} as FactoryElements, {
  get: (_, element) => {
    const tag = element as ValidComponent;

    if (!cache.has(tag)) cache.set(tag, withRender(tag));

    return cache.get(tag);
  },
});
