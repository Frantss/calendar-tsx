import type { ColorToken, PaletteMode, SizeToken } from './tokens';
import { colorTokens, sizeTokens } from './tokens';

type Rgba = [number, number, number, number];

export type ContrastPair = { label: string; ratio: number | null; minimum: number };

export type Measurement = {
  mode: PaletteMode;
  /** Each token's resolved color as `#rrggbb`, or null when the theme does not set it. */
  colors: Record<ColorToken, string | null>;
  /** Each size token's declared value, or an empty string when the theme does not set it. */
  sizes: Record<SizeToken, string>;
  contrast: ContrastPair[];
};

let context: CanvasRenderingContext2D | null = null;

/** Any CSS color (oklch, color-mix, light-dark resolved) as sRGB, by painting it on a 1px canvas. */
const toRgba = (color: string): Rgba | null => {
  context ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  if (!context || !color || color === 'transparent') return null;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);

  const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;

  return a === 0 ? null : [r, g, b, a / 255];
};

const over = ([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba => [
  r * a + br * (1 - a),
  g * a + bg * (1 - a),
  b * a + bb * (1 - a),
  1,
];

const luminance = ([r, g, b]: Rgba) => {
  const channel = (value: number) => {
    const c = value / 255;

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const ratio = (foreground: Rgba, background: Rgba) => {
  const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x) as [number, number];

  return (a + 0.05) / (b + 0.05);
};

const hex = ([r, g, b]: Rgba) => `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

/**
 * Measures the theme as rendered: token colors through probe elements, and contrast pairs with translucent colors
 * composited over the surface they sit on.
 */
export const measureTheme = (mode: PaletteMode): Measurement => {
  const probe = document.createElement('div');

  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0';
  document.body.append(probe);

  const colorOf = (value: string) => {
    const span = document.createElement('span');

    span.style.color = value;
    probe.append(span);

    return getComputedStyle(span).color;
  };

  // an event part picks up the theme's derived event colors (event color tints, high contrast's outline)
  const event = document.createElement('button');

  event.dataset['scope'] = 'calendar';
  event.dataset['part'] = 'time-grid-event';
  probe.append(event);

  const eventStyle = getComputedStyle(event);
  const tokenColor = (name: ColorToken) =>
    name === 'event'
      ? eventStyle.backgroundColor
      : name === 'event-border'
        ? eventStyle.borderTopColor
        : name === 'event-text'
          ? eventStyle.color
          : name === 'focus-ring'
            ? // unset by the themes on purpose; the focus outline falls back to the accent where it is drawn
              colorOf('var(--calendar-focus-ring, var(--calendar-accent, transparent))')
            : colorOf(`var(--calendar-${name}, transparent)`);

  const rgba = Object.fromEntries(colorTokens.map(token => [token.name, toRgba(tokenColor(token.name))])) as Record<
    ColorToken,
    Rgba | null
  >;
  const root = getComputedStyle(document.documentElement);
  const sizes = Object.fromEntries(
    sizeTokens.map(token => [token.name, root.getPropertyValue(`--calendar-${token.name}`).trim()]),
  ) as Record<SizeToken, string>;

  probe.remove();

  const canvas: Rgba = mode === 'dark' ? [0, 0, 0, 1] : [255, 255, 255, 1];
  const surface = rgba.surface ? over(rgba.surface, canvas) : null;
  const pair = (label: string, foreground: Rgba | null, background: Rgba | null, minimum: number): ContrastPair => ({
    label,
    ratio: foreground && background ? ratio(over(foreground, background), background) : null,
    minimum,
  });
  const onSurface = (color: Rgba | null) => (color && surface ? over(color, surface) : null);

  return {
    mode,
    colors: Object.fromEntries(
      colorTokens.map(token => [
        token.name,
        rgba[token.name] && surface ? hex(over(rgba[token.name]!, surface)) : null,
      ]),
    ) as Record<ColorToken, string | null>,
    sizes,
    contrast: [
      pair('Text on surface', rgba.text, surface, 4.5),
      pair('Muted text on surface', rgba['text-muted'], surface, 4.5),
      pair('Muted text on muted surface', rgba['text-muted'], onSurface(rgba['surface-muted']), 4.5),
      pair("Today's number on the accent", rgba['accent-contrast'], onSurface(rgba.accent), 4.5),
      pair('Event text on event fill', rgba['event-text'], onSurface(rgba.event), 4.5),
      pair('Text on all-day bars', rgba['event-color-contrast'], onSurface(rgba['event-color']), 4.5),
      pair('Now line against surface', rgba.now, surface, 3),
      pair('Border against surface', rgba.border, surface, 3),
      pair('Event border against surface', rgba['event-border'], surface, 3),
    ],
  };
};
