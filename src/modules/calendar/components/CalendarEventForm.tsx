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
import { validateCalendarEvent, type CalendarValidationErrors } from '../utils/calendar-validation'
import { validateParticipantPermission } from '../utils/calendar-permissions'
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea'
import { useUnsavedChanges } from '@/modules/pwa/hooks/useUnsavedChanges'
import { CalendarParticipantPicker } from './CalendarParticipantPicker'
import { CalendarCategoryPicker } from './CalendarCategoryPicker'
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
  onSubmit: (input: CalendarEventInput) => void
  onCancel: () => void
}) {
  const today = initialDate ?? toDateKey(new Date())
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
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
  const [endTime, setEndTime] = useState(localPart(event?.endsAt ?? null, 'HH:mm', '10:00'))
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
  const [externalSource, setExternalSource] = useState(event?.externalSource ?? '')
  const [externalId, setExternalId] = useState(event?.externalId ?? '')
  const [errors, setErrors] = useState<CalendarValidationErrors & { permission?: string }>({})
  const [dirty, setDirty] = useState(false)
  const descriptionRef = useAutoResizeTextarea(description)
  const titleId = useId()
  const descriptionId = useId()
  const allDayId = useId()
  const startDateId = useId()
  const startTimeId = useId()
  const endDateId = useId()
  const endTimeId = useId()
  const titleErrorId = `${titleId}-error`
  const descriptionErrorId = `${descriptionId}-error`
  const startErrorId = `${startDateId}-error`
  const endErrorId = `${endDateId}-error`
  const participantErrorId = `${allDayId}-participant-error`
  const permissionErrorId = `${allDayId}-permission-error`
  useUnsavedChanges(dirty)

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    const input: CalendarEventInput = {
      id: event?.id,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      notes: notes.trim(),
      categoryId: categoryId || null,
      allDay,
      allDayStart: allDay ? startDate : null,
      allDayEnd: allDay ? endDate : null,
      startsAt: allDay ? null : stockholmLocalToIso(startDate, startTime),
      endsAt: allDay ? null : stockholmLocalToIso(endDate, endTime),
      isFamilyEvent: family,
      participantIds: participants,
      reminderOffsetsMinutes: reminders,
      recurrence,
      externalSource,
      externalId
    }
    const nextErrors: CalendarValidationErrors & { permission?: string } =
      validateCalendarEvent(input)
    if (permissions.profile)
      nextErrors.permission =
        validateParticipantPermission(permissions.profile, participants, family) ?? undefined
    setErrors(nextErrors)
    if (!Object.values(nextErrors).some(Boolean)) onSubmit(input)
  }

  return (
    <form
      className="calendar-event-form"
      onSubmit={submit}
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
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? titleErrorId : undefined}
        />
        {errors.title && (
          <span id={titleErrorId} className="field-error">
            {errors.title}
          </span>
        )}
      </div>
      <div className="form-field">
        <label htmlFor={descriptionId}>Beskrivning</label>
        <textarea
          ref={descriptionRef}
          id={descriptionId}
          className="calendar-description-textarea"
          rows={2}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? descriptionErrorId : undefined}
        />
        {errors.description && (
          <span id={descriptionErrorId} className="field-error">
            {errors.description}
          </span>
        )}
      </div>
      <section className="calendar-form-section" aria-labelledby={`${allDayId}-section-title`}>
        <h3 id={`${allDayId}-section-title`}>Datum och tid</h3>
        <label className="calendar-checkbox-row all-day-toggle" htmlFor={allDayId}>
          <input
            id={allDayId}
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          <span>Heldagsaktivitet</span>
        </label>
        <div className="date-time-groups">
          <fieldset className="date-time-group">
            <legend>Start</legend>
            <div className="form-field">
              <label htmlFor={startDateId}>Datum *</label>
              <input
                id={startDateId}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-invalid={Boolean(errors.allDayStart || errors.startsAt)}
                aria-describedby={errors.allDayStart || errors.startsAt ? startErrorId : undefined}
              />
            </div>
            {!allDay && (
              <div className="form-field">
                <label htmlFor={startTimeId}>Tid *</label>
                <input
                  id={startTimeId}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  aria-invalid={Boolean(errors.startsAt)}
                  aria-describedby={errors.startsAt ? startErrorId : undefined}
                />
              </div>
            )}
            {(errors.allDayStart || errors.startsAt) && (
              <span id={startErrorId} className="field-error">
                {errors.allDayStart || errors.startsAt}
              </span>
            )}
          </fieldset>
          <fieldset className="date-time-group">
            <legend>Slut</legend>
            <div className="form-field">
              <label htmlFor={endDateId}>Datum *</label>
              <input
                id={endDateId}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={Boolean(errors.allDayEnd || errors.endsAt)}
                aria-describedby={errors.allDayEnd || errors.endsAt ? endErrorId : undefined}
              />
            </div>
            {!allDay && (
              <div className="form-field">
                <label htmlFor={endTimeId}>Tid *</label>
                <input
                  id={endTimeId}
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  aria-invalid={Boolean(errors.endsAt)}
                  aria-describedby={errors.endsAt ? endErrorId : undefined}
                />
              </div>
            )}
            {(errors.allDayEnd || errors.endsAt) && (
              <span id={endErrorId} className="field-error">
                {errors.allDayEnd || errors.endsAt}
              </span>
            )}
          </fieldset>
        </div>
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
        onSelected={setParticipants}
        onFamily={setFamily}
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
          <input maxLength={250} value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <CalendarCategoryPicker
          categories={categories}
          value={categoryId}
          editing={Boolean(event)}
          onChange={setCategoryId}
        />
      </div>
      <CalendarRecurrenceForm value={recurrence} onChange={setRecurrence} />
      {errors.recurrence && <span className="field-error">{errors.recurrence}</span>}
      <CalendarReminderPicker value={reminders} onChange={setReminders} />
      {errors.reminderOffsetsMinutes && (
        <span className="field-error">{errors.reminderOffsetsMinutes}</span>
      )}
      <details>
        <summary>Extern referens</summary>
        <div className="form-row">
          <label>
            Källa
            <input value={externalSource} onChange={(e) => setExternalSource(e.target.value)} />
          </label>
          <label>
            Externt ID
            <input value={externalId} onChange={(e) => setExternalId(e.target.value)} />
          </label>
        </div>
      </details>
      <label>
        Anteckning
        <textarea maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="dialog-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setDirty(false)
            onCancel()
          }}
        >
          Avbryt
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? 'Sparar…' : event ? 'Spara' : 'Skapa aktivitet'}
        </button>
      </div>
    </form>
  )
}
