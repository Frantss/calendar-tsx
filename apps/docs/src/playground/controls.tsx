import type { ReactNode } from 'react';
import { useId } from 'react';

// 32px for a mouse, 44px for a finger: compact by default, full tap targets on touch screens
const height = 'h-8 pointer-coarse:h-11';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fd-ring';

export const inputClass = `${height} w-full min-w-0 rounded-md border border-fd-border bg-fd-background px-2 text-[13px] ${focus} aria-invalid:border-fd-error`;

export const buttonClass = `${height} inline-flex items-center justify-center gap-1.5 rounded-md border border-fd-border bg-fd-secondary px-2.5 text-[13px] font-medium text-fd-secondary-foreground hover:bg-fd-accent disabled:opacity-50 ${focus}`;

/** A square button for an icon, labelled by `aria-label`. */
export const iconButtonClass = `${height} inline-flex aspect-square shrink-0 items-center justify-center rounded-md border border-fd-border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent disabled:opacity-50 ${focus}`;

const labelClass = 'text-[13px] text-fd-muted-foreground';

/** A collapsible group of settings. */
export function Section({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className='group border-b border-fd-border last:border-b-0'>
      <summary
        className={`flex ${height} cursor-pointer list-none items-center justify-between gap-2 rounded-md px-1 text-[13px] font-semibold ${focus} [&::-webkit-details-marker]:hidden`}
      >
        {title}
        <span aria-hidden className='text-fd-muted-foreground transition-transform group-open:rotate-90'>
          ›
        </span>
      </summary>
      <div className='flex flex-col gap-2 px-1 pt-1 pb-3'>{children}</div>
    </details>
  );
}

/** One setting on one row: the label on the left, the control on the right, an optional hint below. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className='grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1'>
      <label className='contents'>
        <span className={labelClass}>{label}</span>
        {children}
      </label>
      {hint && <span className='col-start-2 text-[11px] leading-snug text-fd-muted-foreground'>{hint}</span>}
    </div>
  );
}

/** Radio buttons drawn as a segmented control, on one row with their label. */
export function Segmented<TValue extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: TValue; label: string }[];
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  const name = useId();
  const labelId = useId();

  return (
    <div className='grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2'>
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      <SegmentedButtons name={name} labelledBy={labelId} options={options} value={value} onChange={onChange} />
    </div>
  );
}

/** The buttons of a segmented control on their own, for toolbars that label them elsewhere. */
export function SegmentedButtons<TValue extends string | number>({
  name,
  labelledBy,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  labelledBy?: string;
  label?: string;
  options: readonly { value: TValue; label: string }[];
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div
      role='radiogroup'
      aria-labelledby={labelledBy}
      aria-label={label}
      // on touch: 44px options plus 2px padding and a 1px border on each side
      className='flex h-8 min-w-0 rounded-md border border-fd-border p-0.5 pointer-coarse:h-[50px]'
    >
      {options.map(option => (
        <label
          key={option.value}
          className='flex min-w-0 flex-1 cursor-pointer items-center justify-center truncate rounded-[5px] px-2 text-[12px] hover:bg-fd-accent has-[:checked]:bg-fd-primary has-[:checked]:text-fd-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fd-ring'
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
  );
}

/** A checkbox on the control side of a row, with the setting's name as its label. */
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
    <div className='grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2'>
      <span aria-hidden />
      <label className={`flex ${height} cursor-pointer items-center gap-2 text-[13px]`}>
        <input
          type='checkbox'
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          className={`size-4 accent-fd-primary ${focus}`}
        />
        {label}
      </label>
    </div>
  );
}
