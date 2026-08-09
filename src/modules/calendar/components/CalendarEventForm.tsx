import { useId, useState, type FormEvent } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import type { CalendarCategory } from '../types/calendar-category'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventParticipant
} from '../types/calendar-event'
import type { CalendarRecurrenceInput, CalendarRecurrenceRule } from '../types/calendar-recurrence'
import type { CalendarPermissions } from '../types/calendar-permissions'
import { CALENDAR_TIME_ZONE, stockholmLocalToIso, toDateKey } from '../utils/calendar-dates'
import { durationMinutesBetween, endIsoFromDuration } from '../utils/calendar-duration'
import { validateCalendarEvent, type CalendarValidationErrors } from '../utils/calendar-validation'
import { validateParticipantPermission } from '../utils/calendar-permissions'
import { useUnsavedChanges } from '@/modules/pwa/hooks/useUnsavedChanges'
import { CalendarParticipantPicker } from './CalendarParticipantPicker'
import { CalendarCategoryPicker } from './CalendarCategoryPicker'
import { CalendarDurationPicker } from './CalendarDurationPicker'
import { CalendarRecurrenceForm } from './CalendarRecurrenceForm'
import { CalendarReminderPicker } from './CalendarReminderPicker'

function localPart(iso: string | null, pattern: string, fallback: string) {
  return iso ? formatInTimeZone(iso, CALENDAR_TIME_ZONE, pattern) : fallback
}

export function CalendarEventForm({
  event,
  initialDate,
  initialRecurrence,
  profiles,
  categories,
  permissions,
  busy,
  onSubmit,
  onCancel
}: {
  event?: CalendarEvent
  initialDate?: string
  initialRecurrence?: CalendarRecurrenceRule | null
  profiles: CalendarEventParticipant[]
  categories: CalendarCategory[]
  permissions: CalendarPermissions
  busy: boolean
  onSubmit: (input: CalendarEventInput) => void | Promise<void>
  onCancel: () => void
}) {
  const today = initialDate ?? toDateKey(new Date())
  const [title, setTitle] = useState(event?.title ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startDate, setStartDate] = useState(
    event?.allDayStart ?? localPart(event?.startsAt ?? null, 'yyyy-MM-dd', today)
  )
  const [endDate, setEndDate] = useState(
    event?.allDayEnd ?? localPart(event?.endsAt ?? null, 'yyyy-MM-dd', today)
  )
  const [startTime, setStartTime] = useState(localPart(event?.startsAt ?? null, 'HH:mm', '09:00'))
  const [durationMinutes, setDurationMinutes] = useState(
    durationMinutesBetween(event?.startsAt, event?.endsAt)
  )
  const [family, setFamily] = useState(event?.isFamilyEvent ?? false)
  const [participants, setParticipants] = useState(
    event?.participants.map((person) => person.id) ??
      (permissions.profile ? [permissions.profile.id] : [])
  )
  const [reminders, setReminders] = useState<number[]>(event?.reminderOffsetsMinutes ?? [])
  const [recurrence, setRecurrence] = useState<CalendarRecurrenceInput | null>(
    initialRecurrence
      ? {
          frequency: initialRecurrence.frequency,
          intervalValue: initialRecurrence.intervalValue,
          endsOn: initialRecurrence.endsOn,
          occurrenceCount: initialRecurrence.occurrenceCount
        }
      : null
  )
  const [errors, setErrors] = useState<CalendarValidationErrors & { permission?: string }>({})
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const titleId = useId()
  const allDayId = useId()
  const startDateId = useId()
  const startTimeId = useId()
  const endDateId = useId()
  const titleErrorId = `${titleId}-error`
  const startErrorId = `${startDateId}-error`
  const endErrorId = `${endDateId}-error`
  const durationErrorId = `${startTimeId}-duration-error`
  const participantErrorId = `${allDayId}-participant-error`
  const permissionErrorId = `${allDayId}-permission-error`
  const reminderErrorId = `${allDayId}-reminder-error`
  const saving = busy || submitting
  useUnsavedChanges(dirty)

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (saving) return
    const startsAt = allDay ? null : stockholmLocalToIso(startDate, startTime)
    const endsAt = startsAt ? endIsoFromDuration(startsAt, durationMinutes) : null
    const input: CalendarEventInput = {
      id: event?.id,
      title: title.trim(),
      // Hidden legacy fields are deliberately preserved while their UI is removed.
      description: event?.description ?? '',
      location: location.trim(),
      notes: notes.trim(),
      categoryId: categoryId || null,
      allDay,
      allDayStart: allDay ? startDate : null,
      allDayEnd: allDay ? endDate : null,
      startsAt,
      endsAt: allDay ? null : endsAt,
      isFamilyEvent: family,
      participantIds: participants,
      reminderOffsetsMinutes: reminders,
      recurrence,
      externalSource: event?.externalSource ?? '',
      externalId: event?.externalId ?? ''
    }
    const nextErrors: CalendarValidationErrors & { permission?: string } =
      validateCalendarEvent(input)
    if (permissions.profile)
      nextErrors.permission =
        validateParticipantPermission(permissions.profile, participants, family) ?? undefined
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    try {
      await onSubmit(input)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="calendar-event-form"
      onSubmit={(event) => void submit(event)}
      onChangeCapture={() => setDirty(true)}
      onReset={() => setDirty(false)}
      noValidate
    >
      <div className="form-field">
        <label htmlFor={titleId}>Titel *</label>
        <input
          id={titleId}
          autoFocus
          data-calendar-dialog-initial-focus
          maxLength={150}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? titleErrorId : undefined}
        />
        {errors.title && (
          <span id={titleErrorId} className="field-error">
            {errors.title}
          </span>
        )}
      </div>

      <section className="calendar-form-section" aria-labelledby={`${allDayId}-section-title`}>
        <div className="calendar-form-section__heading">
          <h3 id={`${allDayId}-section-title`}>Datum och tid</h3>
          <label className="calendar-checkbox-row all-day-toggle" htmlFor={allDayId}>
            <input
              id={allDayId}
              type="checkbox"
              checked={allDay}
              onChange={(event) => {
                const checked = event.target.checked
                setAllDay(checked)
                if (checked && !allDay) setEndDate(startDate)
              }}
            />
            <span>Heldagsaktivitet</span>
          </label>
        </div>
        <div className={`date-time-groups ${allDay ? 'all-day' : ''}`}>
          <div className="form-field">
            <label htmlFor={startDateId}>Startdatum *</label>
            <input
              id={startDateId}
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                if (allDay && endDate < event.target.value) setEndDate(event.target.value)
              }}
              aria-invalid={Boolean(errors.allDayStart || errors.startsAt)}
              aria-describedby={errors.allDayStart || errors.startsAt ? startErrorId : undefined}
            />
            {(errors.allDayStart || errors.startsAt) && (
              <span id={startErrorId} className="field-error">
                {errors.allDayStart || errors.startsAt}
              </span>
            )}
          </div>
          {!allDay && (
            <>
              <div className="form-field">
                <label htmlFor={startTimeId}>Starttid *</label>
                <input
                  id={startTimeId}
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  aria-invalid={Boolean(errors.startsAt)}
                  aria-describedby={errors.startsAt ? startErrorId : undefined}
                />
              </div>
              <CalendarDurationPicker
                value={durationMinutes}
                describedBy={errors.endsAt ? durationErrorId : undefined}
                onChange={(minutes) => {
                  setDurationMinutes(minutes)
                  setDirty(true)
                }}
              />
            </>
          )}
          {allDay && (
            <div className="form-field">
              <label htmlFor={endDateId}>Slutdatum *</label>
              <input
                id={endDateId}
                type="date"
                min={startDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                aria-invalid={Boolean(errors.allDayEnd)}
                aria-describedby={errors.allDayEnd ? endErrorId : undefined}
              />
              {errors.allDayEnd && (
                <span id={endErrorId} className="field-error">
                  {errors.allDayEnd}
                </span>
              )}
            </div>
          )}
        </div>
        {!allDay && errors.endsAt && (
          <span id={durationErrorId} className="field-error">
            {errors.endsAt}
          </span>
        )}
      </section>

      <CalendarParticipantPicker
        profiles={profiles}
        selected={participants}
        family={family}
        allowFamily={permissions.canCreateFamilyEvent}
        describedBy={
          [
            errors.participantIds ? participantErrorId : '',
            errors.permission ? permissionErrorId : ''
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        onSelected={(ids) => {
          setParticipants(ids)
          setDirty(true)
        }}
        onFamily={(value) => {
          setFamily(value)
          setDirty(true)
        }}
      />
      {errors.participantIds && (
        <span id={participantErrorId} className="field-error participant-error">
          {errors.participantIds}
        </span>
      )}
      {errors.permission && (
        <span id={permissionErrorId} className="field-error participant-error">
          {errors.permission}
        </span>
      )}

      <div className="form-row">
        <label>
          Plats
          <input
            maxLength={250}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <CalendarCategoryPicker
          categories={categories}
          value={categoryId}
          editing={Boolean(event)}
          onChange={setCategoryId}
        />
      </div>

      <CalendarReminderPicker
        value={reminders}
        describedBy={errors.reminderOffsetsMinutes ? reminderErrorId : undefined}
        onChange={(offsets) => {
          setReminders(offsets)
          setDirty(true)
        }}
      />
      {errors.reminderOffsetsMinutes && (
        <span id={reminderErrorId} className="field-error">
          {errors.reminderOffsetsMinutes}
        </span>
      )}

      <CalendarRecurrenceForm value={recurrence} onChange={setRecurrence} />
      {errors.recurrence && <span className="field-error">{errors.recurrence}</span>}

      <label>
        Anteckning
        <textarea
          maxLength={5000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="dialog-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={saving}
          onClick={() => {
            setDirty(false)
            onCancel()
          }}
        >
          Avbryt
        </button>
        <button type="submit" className="primary-button" disabled={saving} aria-busy={saving}>
          {saving ? 'Sparar…' : event ? 'Spara' : 'Skapa aktivitet'}
        </button>
      </div>
    </form>
  )
}
