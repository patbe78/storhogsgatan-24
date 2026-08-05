import type { CalendarEventParticipant } from '../types/calendar-event'

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
  const toggle = (id: string) =>
    onSelected(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
  return (
    <fieldset className="form-fieldset participant-fieldset" aria-describedby={describedBy}>
      <legend>Deltagare *</legend>
      {allowFamily && (
        <div className="family-participant-option">
          <label className="calendar-checkbox-row">
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
          <label className="participant-option" key={profile.id}>
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
    </fieldset>
  )
}
