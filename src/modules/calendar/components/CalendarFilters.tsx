import type { CalendarCategory } from '../types/calendar-category'
import type { CalendarEventParticipant } from '../types/calendar-event'
import type { CalendarFilters as FilterState } from '../types/calendar-filter'

export function CalendarFilters({
  filters,
  profiles,
  categories,
  onParticipant,
  onCategory,
  onMine,
  onFamily,
  onClear
}: {
  filters: FilterState
  profiles: CalendarEventParticipant[]
  categories: CalendarCategory[]
  onParticipant: (id: string) => void
  onCategory: (id: string) => void
  onMine: (value: boolean) => void
  onFamily: (value: boolean) => void
  onClear: () => void
}) {
  return (
    <aside className="calendar-filters" aria-label="Kalenderfilter">
      <div className="quick-filters">
        <label>
          <input
            type="checkbox"
            checked={filters.mineOnly}
            onChange={(event) => onMine(event.target.checked)}
          />{' '}
          Mina aktiviteter
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.familyOnly}
            onChange={(event) => onFamily(event.target.checked)}
          />{' '}
          Hela familjen
        </label>
      </div>
      <details>
        <summary>Personer</summary>
        {profiles.map((profile) => (
          <label key={profile.id}>
            <input
              type="checkbox"
              checked={filters.participantIds.includes(profile.id)}
              onChange={() => onParticipant(profile.id)}
            />
            {profile.name}
          </label>
        ))}
      </details>
      <details>
        <summary>Kategorier</summary>
        {categories
          .filter((category) => !category.isArchived)
          .map((category) => (
            <label key={category.id}>
              <input
                type="checkbox"
                checked={filters.categoryIds.includes(category.id)}
                onChange={() => onCategory(category.id)}
              />
              {category.name}
            </label>
          ))}
      </details>
      <button type="button" className="text-button filter-clear" onClick={onClear}>
        Rensa filter
      </button>
    </aside>
  )
}
