import { useId, useState } from 'react'
import { CALENDAR_DURATION_OPTIONS, formatDuration } from '../utils/calendar-duration'
import { CalendarPickerSheet } from './CalendarPickerSheet'

export function CalendarDurationPicker({
  value,
  onChange,
  describedBy
}: {
  value: number
  onChange: (minutes: number) => void
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const [customHours, setCustomHours] = useState(Math.floor(value / 60))
  const [customMinutes, setCustomMinutes] = useState(value % 60)
  const buttonId = useId()
  const customTotal = customHours * 60 + customMinutes

  return (
    <div className="form-field calendar-compact-picker">
      <label htmlFor={buttonId}>Varaktighet *</label>
      <button
        id={buttonId}
        type="button"
        className="calendar-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
      >
        <span>{value > 0 ? formatDuration(value) : 'Välj varaktighet'}</span>
        <span aria-hidden="true">›</span>
      </button>
      <CalendarPickerSheet title="Varaktighet" open={open} onClose={() => setOpen(false)}>
        <div className="calendar-picker-options" role="list">
          {CALENDAR_DURATION_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              type="button"
              className={value === option.minutes ? 'selected' : ''}
              aria-pressed={value === option.minutes}
              onClick={() => {
                onChange(option.minutes)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <fieldset className="calendar-custom-picker">
          <legend>Egen tid</legend>
          <div className="calendar-custom-time-row">
            <label>
              Timmar
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={customHours}
                onChange={(event) => setCustomHours(Math.max(0, Number(event.target.value)))}
              />
            </label>
            <label>
              Minuter
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                inputMode="numeric"
                value={customMinutes}
                onChange={(event) => setCustomMinutes(Math.max(0, Number(event.target.value)))}
              />
            </label>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={
              !Number.isInteger(customHours) ||
              !Number.isInteger(customMinutes) ||
              customMinutes > 59 ||
              customTotal <= 0
            }
            onClick={() => {
              onChange(customTotal)
              setOpen(false)
            }}
          >
            Använd egen tid
          </button>
        </fieldset>
      </CalendarPickerSheet>
    </div>
  )
}
