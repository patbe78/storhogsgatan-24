import type { CalendarEventParticipant } from '../types/calendar-event'

export function CalendarParticipantPicker({
  profiles,
  selected,
  family,
  allowFamily,
  onSelected,
  onFamily
}: {
  profiles: CalendarEventParticipant[]
  selected: string[]
  family: boolean
  allowFamily: boolean
  onSelected: (ids: string[]) => void
  onFamily: (value: boolean) => void
}) {
  const toggle = (id: string) =>
    onSelected(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
  return (
    <fieldset className="form-fieldset">
      <legend>Deltagare *</legend>
      {allowFamily && (
        <label>
          <input
            type="checkbox"
            checked={family}
            onChange={(event) => {
              onFamily(event.target.checked)
              if (event.target.checked) onSelected(profiles.map((profile) => profile.id))
            }}
          />{' '}
          Hela familjen
        </label>
      )}
      <div className="participant-picker">
        {profiles.map((profile) => (
          <label key={profile.id}>
            <input
              type="checkbox"
              checked={selected.includes(profile.id)}
              disabled={family}
              onChange={() => toggle(profile.id)}
            />
            <span className="color-dot" style={{ background: profile.color || '#2563eb' }} />
            {profile.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
