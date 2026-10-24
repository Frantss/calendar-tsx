import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { dayGridView, listView, timeGridView, timelineView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import defaultCss from '@calendar-tsx/themes/default.css?inline';
import highContrastCss from '@calendar-tsx/themes/high-contrast.css?inline';
import shadcnCss from '@calendar-tsx/themes/shadcn.css?inline';
import materialCss from '@calendar-tsx/themes/material-ui.css?inline';
import revenuecatCss from '@calendar-tsx/themes/revenuecat.css?inline';
import stripeCss from '@calendar-tsx/themes/stripe.css?inline';
import compactCss from '@calendar-tsx/themes/compact.css?inline';
import { scenario, resources, bookings, background, timed, businessHours, dayWindow } from '../support/fixtures';
import { ScenarioCalendar } from '../support/scenario';

const themes = {
  default: defaultCss,
  'high-contrast': highContrastCss,
  shadcn: shadcnCss,
  'material-ui': materialCss,
  revenuecat: revenuecatCss,
  stripe: stripeCss,
};
const definitions = {
  'Day grid': dayGridView({ weeks: 1, maxEventsPerDay: 3 }),
  'Time grid': timeGridView({
    days: 1,
    timeWindow: { startMinutes: 480, endMinutes: 840 },
    groupBy: 'resource',
    allDay: true,
  }),
  Agenda: listView({ weeks: 1 }),
  Timeline: timelineView({ days: 1, timeWindow: dayWindow, groupBy: 'resource', minSlotWidth: '3rem' }),
};
const samples = Object.entries(definitions).map(([label, view]) => ({
  label,
  config: scenario({
    view,
    resources,
    backgrounds: [businessHours],
    events: [...bookings, background(timed('Lunch shading', '2026-03-11T12:00', '2026-03-11T13:00'))],
  }),
}));
const standIns = {
  '--radius': '0.5rem',
  '--background': '#ffffff',
  '--foreground': '#171717',
  '--muted': '#f5f5f5',
  '--muted-foreground': '#525252',
  '--border': '#a3a3a3',
  '--primary': '#171717',
  '--primary-foreground': '#ffffff',
  '--chart-1': '#93c5fd',
  '--chart-2': '#166534',
  '--destructive': '#b91c1c',
  '--ring': '#1d4ed8',
  '--mui-palette-background-paper': '#ffffff',
  '--mui-palette-text-primary': '#171717',
  '--mui-palette-text-secondary': '#525252',
  '--mui-palette-action-hover': '#f5f5f5',
  '--mui-palette-divider': '#a3a3a3',
  '--mui-palette-primary-main': '#1565c0',
  '--mui-palette-primary-contrastText': '#ffffff',
  '--mui-palette-secondary-main': '#7b1fa2',
  '--mui-palette-secondary-contrastText': '#ffffff',
  '--mui-palette-error-main': '#b91c1c',
  '--mui-palette-success-main': '#166534',
  '--mui-shape-borderRadius': '4px',
};
const Gallery = ({
  theme = 'default',
  scheme = 'light',
  compact = false,
  custom = false,
}: {
  theme?: keyof typeof themes;
  scheme?: 'light' | 'dark';
  compact?: boolean;
  custom?: boolean;
}) => {
  const css = `${themes[theme]}\n${compact ? compactCss : ''}`.replaceAll(':root', ':scope');
  const style = {
    colorScheme: scheme,
    ...standIns,
    ...(custom
      ? {
          '--calendar-accent': '#1f5f8b',
          '--calendar-accent-contrast': '#ffffff',
          '--calendar-event-color': '#166534',
          '--calendar-event-color-contrast': '#ffffff',
          '--calendar-slot-height': '2.5rem',
        }
      : {}),
  } as CSSProperties;
  return (
    <div className='story-surface' data-story-theme={theme} style={{ ...style, maxWidth: 1100 }}>
      <style>{`@scope ([data-story-theme="${theme}"]) { ${css} }`}</style>
      <p>
        Sample bookings. Shadcn and Material UI examples provide host theme variables without loading those component
        libraries.
      </p>
      {samples.map(({ label, config }) => (
        <section key={label} aria-label={label}>
          <h2>{label}</h2>
          <ScenarioCalendar scenario={{ ...config, colorScheme: scheme }} />
        </section>
      ))}
    </div>
  );
};
const meta = { title: 'Styling/Themes', component: Gallery, parameters: { screenshot: true } } satisfies Meta<
  typeof Gallery
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DefaultLight: Story = {};
export const DefaultDark: Story = { args: { scheme: 'dark' } };
export const HighContrastLight: Story = {
  args: { theme: 'high-contrast' },
  play: async ({ canvasElement }) => {
    const event = canvasElement.querySelector('[data-part="day-grid-row-event"][data-all-day]')!;
    await expect(getComputedStyle(event).backgroundColor).toBe('rgb(0, 0, 0)');
  },
};
export const HighContrastDark: Story = { args: { theme: 'high-contrast', scheme: 'dark' } };
export const Shadcn: Story = {
  args: { theme: 'shadcn' },
  play: async ({ canvasElement }) => {
    await expect(
      getComputedStyle(canvasElement.querySelector('[data-part="day-grid-row-event"][data-all-day]')!).backgroundColor,
    ).toBe('rgb(147, 197, 253)');
  },
};
export const MaterialUI: Story = {
  args: { theme: 'material-ui' },
  play: async ({ canvasElement }) => {
    await expect(
      getComputedStyle(canvasElement.querySelector('[data-part="day-grid-row-event"][data-all-day]')!).backgroundColor,
    ).toBe('rgb(123, 31, 162)');
  },
};
export const RevenueCat: Story = { args: { theme: 'revenuecat' } };
export const Stripe: Story = { args: { theme: 'stripe' } };
export const Compact: Story = { args: { compact: true } };
export const CustomTokens: Story = { args: { custom: true } };
export const ForcedColors: Story = {
  parameters: { forcedColors: true },
  play: async () => {
    if (import.meta.env.MODE === 'test') await expect(matchMedia('(forced-colors: active)').matches).toBe(true);
  },
};
export const NarrowViewport: Story = { parameters: { screenshot: { viewport: { width: 390, height: 844 } } } };
