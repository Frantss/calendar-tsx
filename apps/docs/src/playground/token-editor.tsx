import { RotateCcw } from 'lucide-react';
import { useId, useState } from 'react';

import { buttonClass, iconButtonClass, inputClass } from './controls';
import type { Measurement } from './measure';
import type { ColorToken, SizeToken, TokenOverrides } from './tokens';
import { colorTokens, hasTokenOverrides, sizeTokens } from './tokens';

const isHex = (value: string) => /^#[\da-f]{6}$/i.test(value);

/**
 * Overrides for the theme's tokens. Colors are edited for the palette the preview shows, so switch the color scheme
 * to edit the other one; sizes apply to both.
 */
export function TokenEditor({
  tokens,
  measurement,
  usesColors,
  onChange,
}: {
  tokens: TokenOverrides;
  measurement: Measurement | null;
  usesColors: boolean;
  onChange: (tokens: TokenOverrides) => void;
}) {
  const mode = measurement?.mode ?? 'light';

  const setColor = (name: ColorToken, value: string | undefined) => {
    const modes = { ...tokens.colors[name], [mode]: value };

    if (!value) delete modes[mode];

    const colors = { ...tokens.colors, [name]: modes };

    if (!modes.light && !modes.dark) delete colors[name];

    onChange({ ...tokens, colors });
  };

  const setSize = (name: SizeToken, value: string) => {
    const sizes = { ...tokens.sizes, [name]: value };

    if (!value) delete sizes[name];

    onChange({ ...tokens, sizes });
  };

  return (
    <>
      {usesColors && !measurement ? (
        <p className='text-[13px] text-fd-muted-foreground'>Measuring the theme's colors…</p>
      ) : usesColors ? (
        <fieldset className='flex flex-col gap-1'>
          <legend className='mb-1 text-[13px] font-medium'>
            Colors, {mode} palette
            <span className='block text-[11px] font-normal text-fd-muted-foreground'>
              Switch the color scheme to edit the {mode === 'light' ? 'dark' : 'light'} palette.
            </span>
          </legend>
          {colorTokens.map(token => {
            const override = tokens.colors[token.name]?.[mode];
            // the picker only takes #rrggbb; anything else from a hand-edited link shows as measured
            const shown = (override && isHex(override) ? override : measurement?.colors[token.name]) ?? '#000000';

            return (
              <div key={token.name} className='flex items-center gap-2'>
                <input
                  type='color'
                  aria-label={token.label}
                  value={shown}
                  onChange={event => setColor(token.name, event.target.value)}
                  className='size-8 shrink-0 cursor-pointer rounded-md border border-fd-border bg-fd-background p-0.5 pointer-coarse:size-11 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fd-ring'
                />
                <span className='min-w-0 flex-1 truncate text-[13px]'>{token.label}</span>
                <span className={`font-mono text-[11px] ${override ? 'font-semibold' : 'text-fd-muted-foreground'}`}>
                  {shown}
                </span>
                {override ? (
                  <button
                    type='button'
                    onClick={() => setColor(token.name, undefined)}
                    className={iconButtonClass}
                    aria-label={`Reset ${token.label}`}
                    title={`Reset ${token.label}`}
                  >
                    <RotateCcw aria-hidden className='size-3.5' />
                  </button>
                ) : (
                  // keeps the rows aligned whether or not a reset shows
                  <span aria-hidden className='size-8 shrink-0 pointer-coarse:size-11' />
                )}
              </div>
            );
          })}
        </fieldset>
      ) : (
        <p className='text-[13px] text-fd-muted-foreground'>Base only sets positions and sizes, so it has no colors.</p>
      )}
      <fieldset className='flex flex-col gap-2'>
        <legend className='mb-1 text-[13px] font-medium'>Sizes, both palettes</legend>
        {sizeTokens.map(token => (
          <SizeInput
            key={token.name}
            label={token.label}
            property={token.property}
            value={tokens.sizes[token.name] ?? ''}
            placeholder={measurement?.sizes[token.name] || 'not set'}
            onChange={value => setSize(token.name, value)}
          />
        ))}
      </fieldset>
      <button
        type='button'
        disabled={!hasTokenOverrides(tokens)}
        onClick={() => onChange({ colors: {}, sizes: {} })}
        className={buttonClass}
      >
        Reset all tokens
      </button>
    </>
  );
}

/** A length that applies only once the browser accepts it, with a message while it does not. */
function SizeInput({
  label,
  property,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  property: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const errorId = useId();
  const invalid = draft !== '' && !CSS.supports(property, draft.trim());

  // follow resets and shared links
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  return (
    <div className='grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1'>
      <label className='contents'>
        <span className='text-[13px] text-fd-muted-foreground'>{label}</span>
        <input
          type='text'
          value={draft}
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={event => {
            const next = event.target.value.trim();

            setDraft(event.target.value);
            if (next === '' || CSS.supports(property, next)) onChange(next);
          }}
          className={`${inputClass} font-mono`}
        />
      </label>
      {invalid && (
        <span id={errorId} className='col-start-2 text-[11px] text-fd-error'>
          Not a valid value, for example 2.5rem or 12px. The preview keeps the last valid one.
        </span>
      )}
    </div>
  );
}
