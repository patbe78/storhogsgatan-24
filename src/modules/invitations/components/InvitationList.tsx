import type { FamilyInvitation } from '@/modules/family/types/family'
import { formatFamilyDate } from '@/modules/family/utils/family-formatters'
import { invitationStatusLabels, isRevocableInvitation } from '../utils/invitation-status'

interface Props {
  invitations: FamilyInvitation[]
  busyId: string | null
  onRevoke: (id: string) => Promise<void>
}

export function InvitationList({ invitations, busyId, onRevoke }: Props) {
  if (!invitations.length) return <p>Det finns inga tidigare inbjudningar.</p>
  return (
    <div className="family-list">
      {invitations.map((invitation) => (
        <article className="family-row" key={invitation.id}>
          <div className="family-identity">
            <span className="family-color" style={{ background: invitation.profile_color }} />
            <div>
              <strong>{invitation.invited_name}</strong>
              <span>{invitation.email}</span>
            </div>
          </div>
          <dl className="family-meta">
            <div>
              <dt>Status</dt>
              <dd>{invitationStatusLabels[invitation.status]}</dd>
            </div>
            <div>
              <dt>Skapad</dt>
              <dd>{formatFamilyDate(invitation.created_at)}</dd>
            </div>
            <div>
              <dt>Utgår</dt>
              <dd>{formatFamilyDate(invitation.expires_at)}</dd>
            </div>
          </dl>
          {isRevocableInvitation(invitation) && (
            <button
              type="button"
              className="secondary-button"
              disabled={busyId === invitation.id}
              onClick={() => {
                if (window.confirm(`Återkalla inbjudan till ${invitation.email}?`)) {
                  void onRevoke(invitation.id)
                }
              }}
            >
              {busyId === invitation.id ? 'Arbetar…' : 'Återkalla'}
            </button>
          )}
        </article>
      ))}
    </div>
  )
}
