import type { FamilyMember, FamilyRole } from '../types/family'
import { formatFamilyDate, roleLabels } from '../utils/family-formatters'

interface Props {
  members: FamilyMember[]
  active: boolean
  busyId: string | null
  onRole: (id: string, role: FamilyRole) => Promise<void>
  onColor: (id: string, color: string) => Promise<void>
  onActive: (id: string, active: boolean) => Promise<void>
}

export function MemberList({ members, active, busyId, onRole, onColor, onActive }: Props) {
  const visible = members.filter((member) => member.is_active === active)
  if (!visible.length)
    return <p>{active ? 'Inga aktiva medlemmar.' : 'Inga avaktiverade medlemmar.'}</p>
  return (
    <div className="family-list">
      {visible.map((member) => (
        <article className="family-row" key={member.id}>
          <div className="family-identity">
            <span className="family-color" style={{ background: member.color || '#64748B' }} />
            <div>
              <strong>{member.name}</strong>
              <span>{member.email}</span>
            </div>
          </div>
          <dl className="family-meta">
            <div>
              <dt>Roll</dt>
              <dd>{roleLabels[member.role]}</dd>
            </div>
            <div>
              <dt>{active ? 'Ansluten' : 'Avaktiverad'}</dt>
              <dd>{formatFamilyDate(active ? member.joined_at : member.deactivated_at)}</dd>
            </div>
          </dl>
          <div className="family-actions">
            {active && (
              <>
                <label>
                  <span className="sr-only">Roll för {member.name}</span>
                  <select
                    value={member.role}
                    disabled={busyId === member.id}
                    onChange={(event) => void onRole(member.id, event.target.value as FamilyRole)}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Färg för {member.name}</span>
                  <input
                    type="color"
                    value={member.color || '#64748B'}
                    disabled={busyId === member.id}
                    onChange={(event) => void onColor(member.id, event.target.value)}
                  />
                </label>
              </>
            )}
            <button
              type="button"
              className="secondary-button"
              disabled={busyId === member.id}
              onClick={() => {
                const verb = active ? 'avaktivera' : 'återaktivera'
                if (window.confirm(`Vill du ${verb} ${member.name}?`))
                  void onActive(member.id, !active)
              }}
            >
              {busyId === member.id ? 'Arbetar…' : active ? 'Avaktivera' : 'Återaktivera'}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
