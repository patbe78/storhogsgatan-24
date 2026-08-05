import { useState, type FormEvent } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import type { CalendarCategory } from '../types/calendar-category'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventParticipant,
  ReminderType
} from '../types/calendar-event'
import type { CalendarRecurrenceInput, CalendarRecurrenceRule } from '../types/calendar-recurrence'
import type { CalendarPermissions } from '../types/calendar-permissions'
import { CALENDAR_TIME_ZONE, stockholmLocalToIso, toDateKey } from '../utils/calendar-dates'
import { validateCalendarEvent, type CalendarValidationErrors } from '../utils/calendar-validation'
import { validateParticipantPermission } from '../utils/calendar-permissions'
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
  const [reminder, setReminder] = useState<ReminderType>(event?.reminderType ?? 'none')
  const [customMinutes, setCustomMinutes] = useState<number | null>(
    event?.reminderOffsetMinutes ?? null
  )
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
      reminderType: reminder,
      reminderOffsetMinutes: customMinutes,
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
    <form className="calendar-event-form" onSubmit={submit} noValidate>
      <label>
        Titel *
        <input
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </label>
      <label>
        Beskrivning *
        <textarea
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </label>
      <label>
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => {
            setAllDay(e.target.checked)
            setReminder('none')
          }}
        />{' '}
        Heldagsaktivitet
      </label>
      <div className="form-row">
        <label>
          Startdatum *
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        {!allDay && (
          <label>
            Starttid *
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        )}
        <label>
          Slutdatum *
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {errors.allDayEnd && <span className="field-error">{errors.allDayEnd}</span>}
        </label>
        {!allDay && (
          <label>
            Sluttid *
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            {errors.endsAt && <span className="field-error">{errors.endsAt}</span>}
          </label>
        )}
      </div>
      <CalendarParticipantPicker
        profiles={profiles}
        selected={participants}
        family={family}
        allowFamily={permissions.canCreateFamilyEvent}
        onSelected={setParticipants}
        onFamily={setFamily}
      />
      {errors.participantIds && <span className="field-error">{errors.participantIds}</span>}
      {errors.permission && <span className="field-error">{errors.permission}</span>}
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
      <CalendarReminderPicker
        value={reminder}
        customMinutes={customMinutes}
        onChange={(type, minutes) => {
          setReminder(type)
          setCustomMinutes(minutes)
        }}
      />
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
        <button type="button" className="secondary-button" onClick={onCancel}>
          Avbryt
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? 'Sparar…' : 'Spara'}
        </button>
      </div>
    </form>
  )
}
