import { useState } from 'react'
import { CalendarPickerSheet } from './CalendarPickerSheet'

export const CALENDAR_REMINDER_OPTIONS: ReadonlyArray<{ offset: number; label: string }> = [
  { offset: 0, label: 'Vid start' },
  { offset: 5, label: '5 minuter före' },
  { offset: 15, label: '15 minuter före' },
  { offset: 30, label: '30 minuter före' },
  { offset: 60, label: '1 timme före' },
  { offset: 120, label: '2 timmar före' },
  { offset: 1440, label: '1 dag före' },
  { offset: 2880, label: '2 dagar före' }
]

const STANDARD_OFFSETS = new Set(CALENDAR_REMINDER_OPTIONS.map((option) => option.offset))
const UNIT_MINUTES = { minuter: 1, timmar: 60, dagar: 1440 } as const
type ReminderUnit = keyof typeof UNIT_MINUTES

function formatOffset(offset: number, compact = false): string {
  if (offset === 0) return 'Vid start'
  if (offset % 1440 === 0) return `${offset / 1440} ${offset === 1440 ? 'dag' : 'dagar'}`
  if (offset % 60 === 0)
    return `${offset / 60} ${compact ? 'tim' : offset === 60 ? 'timme' : 'timmar'}`
  return `${offset} ${compact ? 'min' : 'minuter'}`
}

function reminderSummary(value: number[]): string {
  if (!value.length) return 'Ingen påminnelse'
  if (value.length === 1) return value[0] === 0 ? 'Vid start' : `${formatOffset(value[0])} före`
  if (value.length === 2)
    return value
      .map((offset) => (offset === 0 ? 'Vid start' : formatOffset(offset, true)))
      .join(' + ')
  return `${value.length} påminnelser`
}

export function CalendarReminderPicker({
  value,
  onChange,
  describedBy
}: {
  value: number[]
  onChange: (offsets: number[]) => void
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const [customValue, setCustomValue] = useState(10)
  const [customUnit, setCustomUnit] = useState<ReminderUnit>('minuter')
  const selected = new Set(value)
  const customOffset = customValue * UNIT_MINUTES[customUnit]
  const customOffsets = value.filter((offset) => !STANDARD_OFFSETS.has(offset))

  function toggle(offset: number) {
    const next = new Set(value)
    if (next.has(offset)) next.delete(offset)
    else next.add(offset)
    onChange([...next].sort((left, right) => left - right))
  }

  function addCustom() {
    if (!Number.isInteger(customValue) || customValue <= 0 || selected.has(customOffset)) return
    onChange([...value, customOffset].sort((left, right) => left - right))
  }

  return (
    <fieldset className="calendar-reminder-picker" aria-describedby={describedBy}>
      <legend>Påminnelser</legend>
      <button
        type="button"
        className="calendar-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
      >
        <span>{reminderSummary(value)}</span>
        <span aria-hidden="true">›</span>
      </button>
      <CalendarPickerSheet title="Påminnelser" open={open} onClose={() => setOpen(false)}>
        <p className="form-help">Välj en eller flera tider.</p>
        <div className="calendar-reminder-options">
          {CALENDAR_REMINDER_OPTIONS.map(({ offset, label }) => (
            <label className="calendar-sheet-option" key={offset}>
              <input
                type="checkbox"
                checked={selected.has(offset)}
                onChange={() => toggle(offset)}
              />
              {label}
            </label>
          ))}
        </div>
        <fieldset className="calendar-custom-picker">
          <legend>Egen tid</legend>
          <div className="calendar-custom-reminder-row">
            <label>
              Värde
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={customValue}
                onChange={(event) => setCustomValue(Number(event.target.value))}
              />
            </label>
            <label>
              Enhet
              <select
                value={customUnit}
                onChange={(event) => setCustomUnit(event.target.value as ReminderUnit)}
              >
                <option value="minuter">Minuter</option>
                <option value="timmar">Timmar</option>
                <option value="dagar">Dagar</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled={
              !Number.isInteger(customValue) || customValue <= 0 || selected.has(customOffset)
            }
            onClick={addCustom}
          >
            Lägg till påminnelse
          </button>
          {selected.has(customOffset) && customValue > 0 && (
            <span className="form-help">Den påminnelsen är redan vald.</span>
          )}
        </fieldset>
        {customOffsets.length > 0 && (
          <ul className="calendar-custom-reminders" aria-label="Anpassade påminnelser">
            {customOffsets.map((offset) => (
              <li key={offset}>
                {formatOffset(offset)} före
                <button type="button" className="text-button" onClick={() => toggle(offset)}>
                  Ta bort
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="primary-button calendar-picker-done"
          onClick={() => setOpen(false)}
        >
          Klar
        </button>
      </CalendarPickerSheet>
    </fieldset>
  )
}
