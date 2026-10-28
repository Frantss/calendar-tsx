import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarDays, Code2, Repeat2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export const Route = createFileRoute('/_site/')({
  component: Home,
});

const secondaryLinkClassName =
  'inline-flex min-h-11 items-center rounded-md border border-fd-border px-4 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring';

const inlineLinkClassName =
  'underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring';

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className='mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center px-6 py-14'>
        <section className='max-w-3xl' aria-labelledby='home-title'>
          <p className='mb-4 text-sm font-medium text-fd-muted-foreground'>Framework-agnostic calendars</p>
          <h1 id='home-title' className='mb-5 text-4xl font-semibold tracking-normal text-fd-foreground sm:text-6xl'>
            calendar-tsx
          </h1>
          <p className='mb-8 max-w-2xl text-lg leading-8 text-fd-muted-foreground'>
            A{' '}
            <Link to='/docs/$' params={{ _splat: '' }} className={inlineLinkClassName}>
              headless calendar library
            </Link>{' '}
            with day grids, time grids, resource timelines, recurrence, and bindings for React and Solid.
          </p>
          <div className='flex flex-wrap gap-3'>
            <Link to='/docs/playground' className={secondaryLinkClassName}>
              Playground
            </Link>
            <Link
              to='/docs/$'
              params={{ _splat: 'react' }}
              className='inline-flex min-h-11 items-center rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:bg-fd-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring'
            >
              React docs
            </Link>
            <Link to='/docs/$' params={{ _splat: 'solid' }} className={secondaryLinkClassName}>
              Solid docs
            </Link>
            <Link to='/docs/$' params={{ _splat: 'react/api' }} className={secondaryLinkClassName}>
              React API
            </Link>
          </div>
          <p className='mt-6 text-sm leading-6 text-fd-muted-foreground'>
            Experimental. The API can change or be removed in any release, without notice.
          </p>
        </section>

        <section className='mt-14 grid gap-4 md:grid-cols-3' aria-label='Calendar capabilities'>
          <Feature title='Calendar views' icon={<CalendarDays className='size-5' aria-hidden='true' />}>
            Render day grids, time grids, lists and resource timelines from a Temporal-based view model.
          </Feature>
          <Feature title='Headless parts' icon={<Code2 className='size-5' aria-hidden='true' />}>
            <Link to='/docs/$' params={{ _splat: 'core' }} className={inlineLinkClassName}>
              Use the core directly
            </Link>
            , or compose unstyled React and Solid parts with a theme or your own CSS.
          </Feature>
          <Feature title='Recurring events' icon={<Repeat2 className='size-5' aria-hidden='true' />}>
            Define recurring events with native rules, or add RRULE support with the optional recurrence package.
          </Feature>
        </section>
      </div>
    </HomeLayout>
  );
}

function Feature({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <article className='rounded-lg border border-fd-border bg-fd-card p-5'>
      <div className='mb-4 text-fd-muted-foreground'>{icon}</div>
      <h2 className='mb-2 text-base font-semibold text-fd-foreground'>{title}</h2>
      <p className='text-sm leading-6 text-fd-muted-foreground'>{children}</p>
    </article>
  );
}
