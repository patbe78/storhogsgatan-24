import { useId, useState, type FormEvent } from 'react'
import type { CalendarCategory } from '../types/calendar-category'
import type { CalendarEventInput, CalendarEventParticipant } from '../types/calendar-event'
import type { CalendarPermissions } from '../types/calendar-permissions'
import { toDateKey } from '../utils/calendar-dates'
import { formatDuration } from '../utils/calendar-duration'
import {
  endTimeForJobShiftPreset,
  findWorkCategory,
  JOB_SHIFT_DURATION_PRESETS,
  jobShiftTiming,
  matchingJobShiftPreset
} from '../utils/job-shift-quick-entry'
import { validateParticipantPermission } from '../utils/calendar-permissions'
import { CalendarParticipantPicker } from './CalendarParticipantPicker'

type QuickEntryErrors = {
  title?: string
  timing?: string
  participants?: string
  permission?: string
  category?: string
}

export function JobShiftQuickEntryForm({
  profiles,
  categories,
  permissions,
  busy,
  success,
  error,
  onSubmit,
  onClose
}: {
  profiles: CalendarEventParticipant[]
  categories: CalendarCategory[]
  permissions: CalendarPermissions
  busy: boolean
  success: boolean
  error: string
  onSubmit: (input: CalendarEventInput) => void | Promise<void>
  onClose: () => void
}) {
  const today = toDateKey(new Date())
  const [title, setTitle] = useState('Jobb')
  const [startDate, setStartDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState(() => endTimeForJobShiftPreset(today, '09:00', 8))
  const [activePreset, setActivePreset] = useState<number | null>(8)
  const [participants, setParticipants] = useState(
    permissions.profile ? [permissions.profile.id] : []
  )
  const [errors, setErrors] = useState<QuickEntryErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const titleId = useId()
  const startDateId = useId()
  const startTimeId = useId()
  const endTimeId = useId()
  const durationId = useId()
  const saving = busy || submitting
  const timing = jobShiftTiming(startDate, startTime, endTime)

  function applyPreset(hours: (typeof JOB_SHIFT_DURATION_PRESETS)[number]) {
    if (!startDate || !startTime) return
    setActivePreset(hours)
    setEndTime(endTimeForJobShiftPreset(startDate, startTime, hours))
  }

  function updateStartDate(value: string) {
    setStartDate(value)
    if (activePreset && value && startTime)
      setEndTime(
        endTimeForJobShiftPreset(
          value,
          startTime,
          activePreset as (typeof JOB_SHIFT_DURATION_PRESETS)[number]
        )
      )
  }

  function updateStartTime(value: string) {
    setStartTime(value)
    if (activePreset && startDate && value)
      setEndTime(
        endTimeForJobShiftPreset(
          startDate,
          value,
          activePreset as (typeof JOB_SHIFT_DURATION_PRESETS)[number]
        )
      )
  }

  function updateEndTime(value: string) {
    setEndTime(value)
    const nextTiming = jobShiftTiming(startDate, startTime, value)
    setActivePreset(nextTiming ? matchingJobShiftPreset(nextTiming.durationMinutes) : null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const workCategory = findWorkCategory(categories)
    const nextTiming = jobShiftTiming(startDate, startTime, endTime)
    const nextErrors: QuickEntryErrors = {}
    if (!title.trim()) nextErrors.title = 'Ange en titel.'
    if (!nextTiming) nextErrors.timing = 'Ange ett giltigt startdatum samt start- och sluttid.'
    if (!participants.length) nextErrors.participants = 'Välj minst en deltagare.'
    if (!workCategory)
      nextErrors.category = 'Systemkategorin Arbete kunde inte hittas. Jobbpasset har inte sparats.'
    if (permissions.profile)
      nextErrors.permission =
        validateParticipantPermission(permissions.profile, participants, false) ?? undefined
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean) || !nextTiming || !workCategory) return

    const input: CalendarEventInput = {
      title: title.trim(),
      description: '',
      location: '',
      notes: '',
      categoryId: workCategory.id,
      startsAt: nextTiming.startsAt,
      endsAt: nextTiming.endsAt,
      allDay: false,
      allDayStart: null,
      allDayEnd: null,
      isFamilyEvent: false,
      participantIds: participants,
      reminderOffsetsMinutes: [],
      recurrence: null,
      externalSource: '',
      externalId: ''
    }
    setSubmitting(true)
    try {
      await onSubmit(input)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="calendar-event-form job-shift-form"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      {success && (
        <p className="job-shift-success" role="status">
          Jobbpass sparat
        </p>
      )}
      {error && (
        <p className="calendar-action-error" role="alert">
          {error}
        </p>
      )}
      {errors.category && (
        <p className="calendar-action-error" role="alert">
          {errors.category}
        </p>
      )}

      <div className="form-field">
        <label htmlFor={titleId}>Titel *</label>
        <input
          id={titleId}
          data-calendar-dialog-initial-focus
          maxLength={150}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>

      <div className="job-shift-time-grid">
        <div className="form-field">
          <label htmlFor={startDateId}>Startdatum *</label>
          <input
            id={startDateId}
            type="date"
            value={startDate}
            onChange={(event) => updateStartDate(event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={startTimeId}>Starttid *</label>
          <input
            id={startTimeId}
            type="time"
            value={startTime}
            onChange={(event) => updateStartTime(event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={endTimeId}>Sluttid *</label>
          <input
            id={endTimeId}
            type="time"
            value={endTime}
            onChange={(event) => updateEndTime(event.target.value)}
          />
        </div>
      </div>
      {errors.timing && <span className="field-error">{errors.timing}</span>}

      <fieldset className="form-fieldset job-shift-duration" aria-describedby={durationId}>
        <legend>Varaktighet</legend>
        <div className="job-shift-duration-presets">
          {JOB_SHIFT_DURATION_PRESETS.map((hours) => (
            <button
              key={hours}
              type="button"
              className="job-shift-duration-chip"
              aria-label={`${hours} timmar`}
              aria-pressed={activePreset === hours}
              onClick={() => applyPreset(hours)}
            >
              {hours} h
            </button>
          ))}
        </div>
        <p id={durationId} className="job-shift-duration-value" aria-live="polite">
          Faktisk varaktighet: {timing ? formatDuration(timing.durationMinutes) : '–'}
        </p>
      </fieldset>

      <CalendarParticipantPicker
        profiles={profiles}
        selected={participants}
        family={false}
        allowFamily={false}
        describedBy={
          errors.participants || errors.permission ? `${durationId}-participant-error` : undefined
        }
        onSelected={setParticipants}
        onFamily={() => undefined}
      />
      {(errors.participants || errors.permission) && (
        <span id={`${durationId}-participant-error`} className="field-error participant-error">
          {errors.participants || errors.permission}
        </span>
      )}

      <div className="dialog-actions job-shift-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>
          Avsluta inmatning
        </button>
        <button type="submit" className="primary-button" disabled={saving} aria-busy={saving}>
          {saving ? 'Sparar…' : 'Spara'}
        </button>
      </div>
    </form>
  )
}
