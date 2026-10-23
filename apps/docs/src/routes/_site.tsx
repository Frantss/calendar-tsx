import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import appCss from '@/styles/app.css?url';

// the docs' CSS and theme provider live here, not on the root, so `/playground/preview` renders with the calendar
// theme alone
export const Route = createFileRoute('/_site')({
  head: () => ({ links: [{ rel: 'stylesheet', href: appCss }] }),
  component: () => (
    <RootProvider>
      <Outlet />
    </RootProvider>
  ),
});
