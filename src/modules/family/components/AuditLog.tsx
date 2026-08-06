import type { FamilyAuditEntry } from '../types/family'
import { formatAuditEntry, formatFamilyDate } from '../utils/family-formatters'

export function AuditLog({ entries }: { entries: FamilyAuditEntry[] }) {
  if (!entries.length) return <p>Ingen familjehistorik finns ännu.</p>
  return (
    <ol className="audit-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span>{formatAuditEntry(entry)}</span>
          <time dateTime={entry.created_at}>{formatFamilyDate(entry.created_at)}</time>
        </li>
      ))}
    </ol>
  )
}
