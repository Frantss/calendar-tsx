import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import appCss from '@/styles/app.css?url';
import { NotFound } from '@/components/not-found';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'calendar-tsx',
      },
    ],
  }),
  component: RootComponent,
  // unknown paths render outside the `_site` layout, so they bring its stylesheet and provider themselves
  notFoundComponent: () => (
    <RootProvider>
      <link rel='stylesheet' href={appCss} precedence='default' />
      <NotFound />
    </RootProvider>
  ),
});

function RootComponent() {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className='flex flex-col min-h-screen'>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
