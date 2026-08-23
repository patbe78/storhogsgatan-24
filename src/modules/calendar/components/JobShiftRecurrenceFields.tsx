import { useState } from 'react'
import {
  JOB_SHIFT_RECURRENCE_OPTIONS,
  type JobShiftEndWeek,
  type JobShiftRecurrence
} from '../utils/job-shift-recurrence'
import { CalendarPickerSheet } from './CalendarPickerSheet'

export function JobShiftRecurrenceFields({
  value,
  endWeeks,
  endWeekKey,
  onValue,
  onEndWeek
}: {
  value: JobShiftRecurrence
  endWeeks: JobShiftEndWeek[]
  endWeekKey: string
  onValue: (value: JobShiftRecurrence) => void
  onEndWeek: (key: string) => void
}) {
  const [recurrenceOpen, setRecurrenceOpen] = useState(false)
  const [weekOpen, setWeekOpen] = useState(false)
  const selectedOption = JOB_SHIFT_RECURRENCE_OPTIONS.find((option) => option.value === value)!
  const selectedWeek = endWeeks.find((week) => week.key === endWeekKey) ?? endWeeks[0]

  return (
    <div className="job-shift-recurrence-fields">
      <div className="form-field">
        <span className="field-label" id="job-shift-recurrence-label">
          Återkommande
        </span>
        <button
          type="button"
          className="calendar-picker-trigger"
          aria-haspopup="dialog"
          aria-expanded={recurrenceOpen}
          aria-labelledby="job-shift-recurrence-label job-shift-recurrence-value"
          onClick={() => setRecurrenceOpen(true)}
        >
          <span id="job-shift-recurrence-value">{selectedOption.label}</span>
          <span aria-hidden="true">›</span>
        </button>
        <CalendarPickerSheet
          title="Återkommande"
          open={recurrenceOpen}
          onClose={() => setRecurrenceOpen(false)}
        >
          <div className="job-shift-recurrence-options" role="radiogroup" aria-label="Återkommande">
            {JOB_SHIFT_RECURRENCE_OPTIONS.map((option) => (
              <label className="calendar-sheet-option" key={option.value}>
                <input
                  type="radio"
                  name="job-shift-recurrence"
                  checked={option.value === value}
                  onChange={() => {
                    onValue(option.value)
                    setRecurrenceOpen(false)
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </CalendarPickerSheet>
      </div>

      {value !== 'none' && selectedWeek && (
        <div className="form-field">
          <span className="field-label" id="job-shift-end-week-label">
            Till och med vecka
          </span>
          <button
            type="button"
            className="calendar-picker-trigger"
            aria-haspopup="dialog"
            aria-expanded={weekOpen}
            aria-labelledby="job-shift-end-week-label job-shift-end-week-value"
            onClick={() => setWeekOpen(true)}
          >
            <span id="job-shift-end-week-value">{selectedWeek.label}</span>
            <span aria-hidden="true">›</span>
          </button>
          <CalendarPickerSheet
            title="Till och med vecka"
            open={weekOpen}
            onClose={() => setWeekOpen(false)}
          >
            <div className="job-shift-week-wheel" role="radiogroup" aria-label="Till och med vecka">
              {endWeeks.map((week) => (
                <label className="calendar-sheet-option" key={week.key}>
                  <input
                    type="radio"
                    name="job-shift-end-week"
                    checked={week.key === selectedWeek.key}
                    onChange={() => {
                      onEndWeek(week.key)
                      setWeekOpen(false)
                    }}
                  />
                  <span>{week.label}</span>
                </label>
              ))}
            </div>
          </CalendarPickerSheet>
        </div>
      )}
    </div>
  )
}
