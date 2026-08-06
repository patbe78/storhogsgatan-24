import { InvitationForm } from '@/modules/invitations/components/InvitationForm'
import { InvitationList } from '@/modules/invitations/components/InvitationList'
import { useFamilyAdministration } from '../hooks/useFamilyAdministration'
import { AuditLog } from './AuditLog'
import { MemberList } from './MemberList'

export function FamilyAdministration() {
  const family = useFamilyAdministration()
  if (family.loading) return null
  if (!family.authorized) return null
  return (
    <section className="family-panel" aria-labelledby="family-heading">
      <header>
        <p className="eyebrow">Administration</p>
        <h2 id="family-heading">Familjemedlemmar</h2>
        <p>Bjud in och administrera personer i hushållet.</p>
      </header>
      <InvitationForm onCreated={family.reload} />
      {family.message && (
        <p role="alert" className="family-message">
          {family.message}
        </p>
      )}
      <section>
        <h3>Aktiva medlemmar</h3>
        <MemberList
          members={family.members}
          active
          busyId={family.busyId}
          onRole={family.updateRole}
          onColor={family.updateColor}
          onActive={family.setActive}
        />
      </section>
      <section>
        <h3>Avaktiverade medlemmar</h3>
        <MemberList
          members={family.members}
          active={false}
          busyId={family.busyId}
          onRole={family.updateRole}
          onColor={family.updateColor}
          onActive={family.setActive}
        />
      </section>
      <section>
        <h3>Inbjudningar</h3>
        <InvitationList
          invitations={family.invitations}
          busyId={family.busyId}
          onRevoke={family.revoke}
        />
      </section>
      <section>
        <h3>Historik</h3>
        <AuditLog entries={family.audit} />
      </section>
    </section>
  )
}
