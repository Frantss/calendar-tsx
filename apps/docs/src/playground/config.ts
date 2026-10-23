import { Temporal } from 'temporal-polyfill';

import type { PlaygroundView } from './views';
import { playgroundViews } from './views';

export const playgroundThemes = [
  { id: 'default', label: 'Default' },
  { id: 'high-contrast', label: 'High contrast' },
  { id: 'shadcn', label: 'shadcn/ui' },
  { id: 'material-ui', label: 'Material UI' },
  { id: 'revenuecat', label: 'RevenueCat' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'base', label: 'Base only (positioning)' },
] as const;

export type PlaygroundTheme = (typeof playgroundThemes)[number]['id'];
export type PlaygroundDensity = 'regular' | 'compact';
export type PlaygroundScheme = 'light' | 'dark' | 'system';

export type PlaygroundConfig = {
  view: PlaygroundView;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  theme: PlaygroundTheme;
  density: PlaygroundDensity;
  scheme: PlaygroundScheme;
};

const schemes: readonly PlaygroundScheme[] = ['light', 'dark', 'system'];
const densities: readonly PlaygroundDensity[] = ['regular', 'compact'];

const isView = (value: string | null): value is PlaygroundView => value !== null && value in playgroundViews.views;
const isTheme = (value: string | null): value is PlaygroundTheme => playgroundThemes.some(theme => theme.id === value);
const isScheme = (value: string | null): value is PlaygroundScheme => schemes.includes(value as PlaygroundScheme);
const isDensity = (value: string | null): value is PlaygroundDensity => densities.includes(value as PlaygroundDensity);

const isDate = (value: string | null): value is string => {
  if (!value) return false;

  try {
    return Temporal.PlainDate.from(value).toString() === value;
  } catch {
    return false;
  }
};

export const defaultPlaygroundConfig = (today: string): PlaygroundConfig => ({
  view: 'week',
  date: today,
  theme: 'default',
  density: 'regular',
  scheme: 'system',
});

/** Reads a config from a URL hash; anything missing or invalid falls back to the default. */
export const parsePlaygroundConfig = (hash: string, today: string): PlaygroundConfig => {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const fallback = defaultPlaygroundConfig(today);
  const view = params.get('view');
  const date = params.get('date');
  const theme = params.get('theme');
  const density = params.get('density');
  const scheme = params.get('scheme');

  return {
    view: isView(view) ? view : fallback.view,
    date: isDate(date) ? date : fallback.date,
    theme: isTheme(theme) ? theme : fallback.theme,
    density: isDensity(density) ? density : fallback.density,
    scheme: isScheme(scheme) ? scheme : fallback.scheme,
  };
};

export const serializePlaygroundConfig = (config: PlaygroundConfig) =>
  new URLSearchParams({
    view: config.view,
    date: config.date,
    theme: config.theme,
    density: config.density,
    scheme: config.scheme,
  }).toString();
