export const colorTokens = [
  { name: 'accent', label: 'Accent' },
  { name: 'accent-contrast', label: 'On accent' },
  { name: 'surface', label: 'Surface' },
  { name: 'surface-muted', label: 'Muted surface' },
  { name: 'text', label: 'Text' },
  { name: 'text-muted', label: 'Muted text' },
  { name: 'border', label: 'Border' },
  { name: 'event', label: 'Event fill' },
  { name: 'event-border', label: 'Event border' },
  { name: 'event-text', label: 'Event text' },
  { name: 'focus-ring', label: 'Focus ring' },
] as const;

/** `property` is the CSS property a value must be valid for. */
export const sizeTokens = [
  { name: 'radius', label: 'Radius', property: 'border-radius' },
  { name: 'bar-radius', label: 'Bar radius', property: 'border-radius' },
  { name: 'font-size', label: 'Font size', property: 'font-size' },
  { name: 'slot-height', label: 'Slot height', property: 'height' },
  { name: 'bar-height', label: 'Bar height', property: 'height' },
  { name: 'day-header-height', label: 'Day header height', property: 'height' },
  { name: 'axis-width', label: 'Axis width', property: 'width' },
] as const;

export type ColorToken = (typeof colorTokens)[number]['name'];
export type SizeToken = (typeof sizeTokens)[number]['name'];
export type PaletteMode = 'light' | 'dark';

export type TokenOverrides = {
  colors: Partial<Record<ColorToken, Partial<Record<PaletteMode, string>>>>;
  sizes: Partial<Record<SizeToken, string>>;
};

export const emptyTokenOverrides = (): TokenOverrides => ({ colors: {}, sizes: {} });

const colorNames = new Set<string>(colorTokens.map(token => token.name));
const sizeProperties = new Map<string, string>(sizeTokens.map(token => [token.name, token.property]));
const isColor = (value: unknown): value is string => typeof value === 'string' && CSS.supports('color', value);

/** Keeps only known tokens with values the browser accepts, so a hand-edited link cannot inject CSS. */
export const sanitizeTokenOverrides = (input: unknown): TokenOverrides => {
  const result = emptyTokenOverrides();

  if (typeof input !== 'object' || input === null) return result;

  const { colors, sizes } = input as { colors?: Record<string, unknown>; sizes?: Record<string, unknown> };

  for (const [name, modes] of Object.entries(colors ?? {})) {
    if (!colorNames.has(name) || typeof modes !== 'object' || modes === null) continue;

    const { light, dark } = modes as Record<string, unknown>;
    const entry: Partial<Record<PaletteMode, string>> = {};

    if (isColor(light)) entry.light = light;
    if (isColor(dark)) entry.dark = dark;
    if (entry.light || entry.dark) result.colors[name as ColorToken] = entry;
  }

  for (const [name, value] of Object.entries(sizes ?? {})) {
    const property = sizeProperties.get(name);

    if (property && typeof value === 'string' && CSS.supports(property, value)) result.sizes[name as SizeToken] = value;
  }

  return result;
};

export const hasTokenOverrides = (tokens: TokenOverrides) =>
  Object.keys(tokens.colors).length > 0 || Object.keys(tokens.sizes).length > 0;

/**
 * The overrides as one unlayered stylesheet, which wins over the themes' layers. Colors are split by palette,
 * because the preview sets its scheme with a `.dark` class as well as `color-scheme`.
 */
export const tokenOverridesCss = (tokens: TokenOverrides) => {
  const declarations = (entries: [string, string | undefined][]) =>
    entries.flatMap(([name, value]) => (value ? [`  --calendar-${name}: ${value};`] : [])).join('\n');

  const colors = Object.entries(tokens.colors);
  const blocks = [
    [':root', declarations(Object.entries(tokens.sizes))],
    [':root:not(.dark)', declarations(colors.map(([name, modes]) => [name, modes?.light]))],
    [':root.dark', declarations(colors.map(([name, modes]) => [name, modes?.dark]))],
  ];

  return blocks.flatMap(([selector, body]) => (body ? [`${selector} {\n${body}\n}`] : [])).join('\n');
};
