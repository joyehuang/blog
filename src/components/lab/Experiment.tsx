import type { ReactNode } from 'react'

import './experiment.css'

export function Experiment({ children }: { children: ReactNode }) {
  return <div className='lab-experiment'>{children}</div>
}

export function Toggle({
  children,
  checked,
  onChange
}: {
  children: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className='lab-toggle'>
      <input
        type='checkbox'
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  )
}

// Keep every label mounted: changing a control state crossfades, without layout shifts.
export function Feedback({ value, labels }: { value: string; labels: Record<string, string> }) {
  return (
    <span className='lab-feedback' aria-live='polite' aria-atomic='true'>
      {Object.entries(labels).map(([key, label]) => (
        <span key={key} aria-hidden={value !== key} data-current={value === key}>
          {label}
        </span>
      ))}
    </span>
  )
}
