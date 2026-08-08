import { useState } from 'react'

const OPTIONS: Array<[number, string]> = [
  [0, 'Vid start'],
  [5, '5 minuter före'],
  [15, '15 minuter före'],
  [30, '30 minuter före'],
  [60, '1 timme före'],
  [120, '2 timmar före'],
  [1440, '1 dag före'],
  [2880, '2 dagar före']
]

const STANDARD_OFFSETS = new Set(OPTIONS.map(([offset]) => offset))

export function CalendarReminderPicker({
  value,
  onChange
}: {
  value: number[]
  onChange: (offsets: number[]) => void
}) {
  const [customMinutes, setCustomMinutes] = useState(10)
  const selected = new Set(value)
  const custom = value.filter((offset) => !STANDARD_OFFSETS.has(offset))

  function toggle(offset: number) {
    const next = new Set(value)
    if (next.has(offset)) next.delete(offset)
    else next.add(offset)
    onChange([...next].sort((left, right) => left - right))
  }

  function addCustom() {
    if (!Number.isInteger(customMinutes) || customMinutes < 0 || selected.has(customMinutes)) return
    onChange([...value, customMinutes].sort((left, right) => left - right))
  }

  return (
    <fieldset className="calendar-reminder-picker">
      <legend>Påminnelser</legend>
      <p>Välj en eller flera tider.</p>
      <div className="calendar-reminder-options">
        {OPTIONS.map(([offset, label]) => (
          <label key={offset}>
            <input type="checkbox" checked={selected.has(offset)} onChange={() => toggle(offset)} />
            {label}
          </label>
        ))}
      </div>
      <div className="form-row">
        <label>
          Anpassade minuter före
          <input
            type="number"
            min="0"
            step="1"
            value={customMinutes}
            onChange={(event) => setCustomMinutes(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          className="secondary-button"
          disabled={
            !Number.isInteger(customMinutes) || customMinutes < 0 || selected.has(customMinutes)
          }
          onClick={addCustom}
        >
          Lägg till påminnelse
        </button>
      </div>
      {custom.length > 0 && (
        <ul className="calendar-custom-reminders" aria-label="Anpassade påminnelser">
          {custom.map((offset) => (
            <li key={offset}>
              {offset} minuter före
              <button type="button" className="text-button" onClick={() => toggle(offset)}>
                Ta bort
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
