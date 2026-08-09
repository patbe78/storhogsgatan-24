import { useState } from 'react'
import type { CalendarEventParticipant } from '../types/calendar-event'
import { CalendarPickerSheet } from './CalendarPickerSheet'

export function CalendarParticipantPicker({
  profiles,
  selected,
  family,
  allowFamily,
  describedBy,
  onSelected,
  onFamily
}: {
  profiles: CalendarEventParticipant[]
  selected: string[]
  family: boolean
  allowFamily: boolean
  describedBy?: string
  onSelected: (ids: string[]) => void
  onFamily: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const toggle = (id: string) =>
    onSelected(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
  const selectedProfiles = profiles.filter((profile) => selected.includes(profile.id))
  const summary = family
    ? 'Hela familjen'
    : selectedProfiles.length === 0
      ? 'Välj deltagare'
      : selectedProfiles.length === 1
        ? selectedProfiles[0].name
        : selectedProfiles.length === 2
          ? `${selectedProfiles[0].name} + ${selectedProfiles[1].name}`
          : `${selectedProfiles.length} deltagare`
  return (
    <fieldset className="form-fieldset participant-fieldset" aria-describedby={describedBy}>
      <legend>Deltagare *</legend>
      <button
        type="button"
        className="calendar-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
      >
        <span>{summary}</span>
        <span aria-hidden="true">›</span>
      </button>
      <CalendarPickerSheet title="Deltagare" open={open} onClose={() => setOpen(false)}>
        {allowFamily && (
          <div className="family-participant-option">
            <label className="calendar-checkbox-row calendar-sheet-option">
              <input
                type="checkbox"
                checked={family}
                onChange={(event) => {
                  onFamily(event.target.checked)
                  if (event.target.checked) onSelected(profiles.map((profile) => profile.id))
                }}
              />
              <span>Hela familjen</span>
            </label>
          </div>
        )}
        <div className="participant-picker">
          {profiles.map((profile) => (
            <label className="participant-option calendar-sheet-option" key={profile.id}>
              <input
                type="checkbox"
                checked={selected.includes(profile.id)}
                disabled={family}
                onChange={() => toggle(profile.id)}
              />
              <span
                className="color-dot participant-color-dot"
                style={{ background: profile.color || '#64748b' }}
                aria-hidden="true"
              />
              <span>{profile.name}</span>
            </label>
          ))}
        </div>
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
