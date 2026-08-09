import type { CalendarFrequency, CalendarRecurrenceInput } from '../types/calendar-recurrence'

export function CalendarRecurrenceForm({
  value,
  onChange
}: {
  value: CalendarRecurrenceInput | null
  onChange: (value: CalendarRecurrenceInput | null) => void
}) {
  if (!value)
    return (
      <label className="calendar-checkbox-row recurrence-toggle">
        <input
          type="checkbox"
          checked={false}
          onChange={() => onChange({ frequency: 'weekly', intervalValue: 1 })}
        />
        <span>Återkommande aktivitet</span>
      </label>
    )
  return (
    <fieldset className="form-fieldset">
      <legend>Återkomst</legend>
      <label className="calendar-checkbox-row recurrence-toggle active">
        <input type="checkbox" checked onChange={() => onChange(null)} />
        <span>Återkommande aktivitet</span>
      </label>
      <div className="form-row">
        <label>
          Frekvens
          <select
            value={value.frequency}
            onChange={(event) =>
              onChange({ ...value, frequency: event.target.value as CalendarFrequency })
            }
          >
            <option value="daily">Dagligen</option>
            <option value="weekly">Varje vecka</option>
            <option value="monthly">Varje månad</option>
            <option value="yearly">Varje år</option>
          </select>
        </label>
        <label>
          Intervall
          <input
            type="number"
            min="1"
            value={value.intervalValue}
            onChange={(event) => onChange({ ...value, intervalValue: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Slutdatum
          <input
            type="date"
            value={value.endsOn ?? ''}
            disabled={value.occurrenceCount != null}
            onChange={(event) =>
              onChange({ ...value, endsOn: event.target.value || null, occurrenceCount: null })
            }
          />
        </label>
        <label>
          Antal förekomster
          <input
            type="number"
            min="1"
            value={value.occurrenceCount ?? ''}
            disabled={Boolean(value.endsOn)}
            onChange={(event) =>
              onChange({
                ...value,
                occurrenceCount: event.target.value ? Number(event.target.value) : null,
                endsOn: null
              })
            }
          />
        </label>
      </div>
      <p className="form-help">
        Lämna båda avslutningsfälten tomma för inget slut. Varannan vecka väljs med intervall 2 och
        vecka.
      </p>
    </fieldset>
  )
}
