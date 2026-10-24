import { usePathname } from 'fumadocs-core/framework';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';

import { CalendarPreview } from './calendar-preview';

const isRelative = (href: string) => !/^([a-z][a-z\d+.-]*:|\/|#)/i.test(href);

/**
 * Shared content is included into every framework root, so it links relatively (`../features/overflow`).
 * Resolved here against the current page, since the router would resolve it against the route pattern.
 */
function RelativeLink({ href, ...props }: ComponentProps<'a'>) {
  const pathname = usePathname();

  if (!href || !isRelative(href)) return <defaultMdxComponents.a href={href} {...props} />;

  const url = new URL(href, `https://docs.invalid${pathname}`);

  return <defaultMdxComponents.a href={`${url.pathname}${url.search}${url.hash}`} {...props} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    a: RelativeLink,
    CalendarPreview,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
