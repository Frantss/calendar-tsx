import type { ReactNode } from 'react';
import { useId } from 'react';

export const inputClass =
  'min-h-11 w-full rounded-lg border border-fd-border bg-fd-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-fd-ring aria-invalid:border-fd-error';

export const buttonClass =
  'min-h-11 rounded-lg border border-fd-border bg-fd-secondary px-4 text-sm font-medium text-fd-secondary-foreground hover:bg-fd-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-fd-ring';

/** A collapsible group of settings. */
export function Section({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className='group rounded-xl border border-fd-border'>
      <summary className='flex min-h-11 cursor-pointer items-center justify-between rounded-xl px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-fd-ring'>
        {title}
        <span aria-hidden className='text-fd-muted-foreground transition-transform group-open:rotate-90'>
          ›
        </span>
      </summary>
      <div className='flex flex-col gap-4 px-4 pt-1 pb-4'>{children}</div>
    </details>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className='flex flex-col gap-1.5 text-sm font-medium'>
      {label}
      {children}
      {hint && <span className='text-xs font-normal text-fd-muted-foreground'>{hint}</span>}
    </label>
  );
}

export function Segmented<TValue extends string | number>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly { value: TValue; label: string }[];
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  const name = useId();

  return (
    <fieldset className='flex flex-col gap-1.5'>
      <legend className='mb-1.5 text-sm font-medium'>{legend}</legend>
      <div className='flex flex-wrap gap-1 rounded-lg border border-fd-border p-1'>
        {options.map(option => (
          <label
            key={option.value}
            className='flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-sm hover:bg-fd-accent has-[:checked]:bg-fd-primary has-[:checked]:text-fd-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fd-ring'
          >
            <input
              type='radio'
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className='sr-only'
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className='flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium'>
      <input
        type='checkbox'
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className='size-5 accent-fd-primary focus-visible:outline-2 focus-visible:outline-fd-ring'
      />
      {label}
    </label>
  );
}
