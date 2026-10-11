import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'

// Fork: the building blocks every Settings tab is made of, so the tabs read as one window:
// a section title, a grouped box of rows on one 96px label column, one control size
// (px-2.5 py-1 text-xs), segmented controls, switches and sliders.
// Colours are palette tokens only; text is never lighter than text-muted (AA on every surface).

type SectionProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode
  description?: ReactNode
  /** A control that belongs to the whole section, shown on the right of the title. */
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, description, action, children, ...rest }: SectionProps) {
  return (
    <section {...rest}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1 basis-72">
          <h3 className="text-sm font-semibold text-strong">{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

/** A rounded box of rows with hairlines between them. */
export function Group({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`divide-y divide-line rounded-xl bg-raised ring-1 ring-line ${className}`}>
      {children}
    </div>
  )
}

/** The one row layout: a 96px label column, the control and its hint on the right. */
export function Row({
  label,
  hint,
  children,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div {...rest} className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-x-4 px-4 py-3">
      <div className="pt-1 text-xs font-medium leading-5 text-soft">{label}</div>
      <div className="min-w-0">
        {children}
        {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
      </div>
    </div>
  )
}

/** A small label above a part of a group (Gradient, Pattern). */
export function SubLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-4">
      <span className="text-xs font-medium text-soft">{children}</span>
      {aside && <span className="text-xs text-muted">{aside}</span>}
    </div>
  )
}

/** The one control size in Settings: buttons, segments and fields all share it. */
const control = 'px-2.5 py-1 text-xs font-medium'

const buttonBase = `inline-flex items-center justify-center gap-1.5 rounded-lg ${control} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default disabled:opacity-50`

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  const look =
    variant === 'primary'
      ? 'bg-accent text-on-accent hover:bg-accent-hover'
      : variant === 'quiet'
        ? 'text-muted hover:bg-hover hover:text-fg'
        : 'bg-card text-fg ring-1 ring-line-strong hover:bg-hover'
  return <button type="button" {...rest} className={`${buttonBase} ${look} ${className}`} />
}

export const fieldClass = `rounded-lg border border-line-strong bg-card ${control} text-fg outline-none placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/25`

export function Segmented<T extends string>(props: {
  label: string
  value: T
  options: Array<{ value: T; label: string; icon?: ReactNode }>
  onChange: (value: T) => void
  /** Long lists wrap into even rows of this many equal options instead of a ragged second line. */
  columns?: 4 | 5
}) {
  const { label, value, options, onChange, columns } = props
  const layout = columns === 5 ? 'inline-grid grid-cols-5' : columns === 4 ? 'inline-grid grid-cols-4' : 'inline-flex flex-wrap'
  return (
    <div role="radiogroup" aria-label={label} className={`${layout} max-w-full gap-0.5 rounded-lg bg-sunken p-0.5 ring-1 ring-line`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-option={o.value}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md ${control} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              on ? 'bg-card text-strong shadow-xs ring-1 ring-line' : 'text-muted hover:bg-hover hover:text-fg'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * A switch with its label beside it. On is neutral (the text colour); only a master switch,
 * the one that turns a whole feature on, takes the accent.
 */
export function Toggle(props: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  tone?: 'neutral' | 'accent'
}) {
  const id = useId()
  const on = props.tone === 'accent' ? 'peer-checked:bg-accent' : 'peer-checked:bg-strong'
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 pt-1">
      <span className="relative mt-px inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`h-4.5 w-8 rounded-full bg-line-strong transition-colors ${on} peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-raised`}
        />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-card shadow-xs transition-transform peer-checked:translate-x-3.5" />
      </span>
      <span className="min-w-0 text-xs">
        <span className="block font-medium leading-5 text-fg">{props.label}</span>
        {props.hint && <span className="block leading-snug text-muted">{props.hint}</span>}
      </span>
    </label>
  )
}

/** A range with its value; the row it sits in carries the label. */
export function Slider(props: {
  label: string
  value: number
  min?: number
  max: number
  unit: string
  onChange: (v: number) => void
}) {
  const { label, value, min = 0, max, unit, onChange } = props
  return (
    <div className="flex h-7 items-center gap-4">
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={1}
        value={value}
        data-slider={label.toLowerCase()}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-accent"
      />
      <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted">
        {value}
        {unit}
      </span>
    </div>
  )
}

/** Buttons in a row, nudged onto the row label's centre line. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 pt-0.5">{children}</div>
}
