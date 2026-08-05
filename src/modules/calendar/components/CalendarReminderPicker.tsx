import type { ReminderType } from '../types/calendar-event'

const OPTIONS: Array<[ReminderType, string]> = [
  ['none', 'Ingen påminnelse'],
  ['at_start', 'Vid start'],
  ['5_minutes', '5 minuter före'],
  ['15_minutes', '15 minuter före'],
  ['30_minutes', '30 minuter före'],
  ['1_hour', '1 timme före'],
  ['1_day', '1 dag före'],
  ['custom', 'Anpassad tid']
]
export function CalendarReminderPicker({
  value,
  customMinutes,
  onChange
}: {
  value: ReminderType
  customMinutes: number | null
  onChange: (type: ReminderType, minutes: number | null) => void
}) {
  return (
    <div className="form-row">
      <label>
        Påminnelse
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value as ReminderType,
              event.target.value === 'custom' ? (customMinutes ?? 10) : null
            )
          }
        >
          {OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {value === 'custom' && (
        <label>
          Minuter före
          <input
            type="number"
            min="0"
            value={customMinutes ?? 10}
            onChange={(event) => onChange(value, Number(event.target.value))}
          />
        </label>
      )}
    </div>
  )
}
