import type {
  Calendar_EmptyState,
  Calendar_PropsFn,
  Calendar_PolymorphicProps,
  ElementType,
} from '#rendering/rendering.types';
// Port of Ark v6's Solid `ark` factory (chakra-ui/ark, `@ark-ui/solid@6.0.0-next.0`, src/components/factory.tsx)
// without `asChild` and without `@zag-js/solid`'s `mergeProps` (D25, D31).
import type { ComponentProps, JSX, ValidComponent } from '#rendering/solid';
import { Dynamic, splitProps, untrack } from '#rendering/solid';

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
    const resolved = untrack(() => resolve(source));

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

type FactoryProps = Calendar_PolymorphicProps<any> & {
  /** The part's state, forwarded to the `render` function. Set by the part, not the consumer. */
  state?: unknown;
};

type FactoryComponent<E extends ElementType> = (props: ComponentProps<E> & FactoryProps) => JSX.Element;
type FactoryElements = { [E in ElementType]: FactoryComponent<E> };

const EMPTY_STATE: Calendar_EmptyState = Object.freeze({});

const withRender = (Component: ValidComponent) => (props: FactoryProps & AnyProps) => {
  const [local, restProps] = splitProps(props, ['render', 'state']);

  // unlike Ark, `ref` stays in the props, so a part's ref reaches the rendered node through `props()`
  const propsFn: Calendar_PropsFn = userProps => calendarProps_merge(restProps, userProps);

  const render = untrack(() => local.render);
  if (render) return render(propsFn, () => (local.state ?? EMPTY_STATE) as never);

  return <Dynamic component={Component} {...restProps} />;
};

const cache = new Map<ValidComponent, ReturnType<typeof withRender>>();

/** `calendarFactory_elements.div`, `.button`, …: unstyled elements with `render` support, one component per tag. */
export const calendarFactory_elements = new Proxy({} as FactoryElements, {
  get: (_, element) => {
    const tag = element as ValidComponent;

    if (!cache.has(tag)) cache.set(tag, withRender(tag));

    return cache.get(tag);
  },
});
