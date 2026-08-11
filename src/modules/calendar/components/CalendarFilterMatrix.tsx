import type { CalendarCategory } from '../types/calendar-category'
import type { CalendarEventParticipant } from '../types/calendar-event'
import type { CalendarFilterCell, CalendarFilterMatrixValue } from '../types/calendar-filter'
import {
  calendarFilterCellKey,
  calendarFilterColumns,
  createShowAllCalendarFilter,
  selectedCalendarFilterCellKeys,
  setCalendarFilterCell,
  setCalendarFilterCells
} from '../utils/calendar-filter'
import '../calendar.css'

export function CalendarFilterMatrix({
  members,
  categories,
  value,
  onChange,
  disabled = false
}: {
  members: CalendarEventParticipant[]
  categories: CalendarCategory[]
  value: CalendarFilterMatrixValue
  onChange: (value: CalendarFilterMatrixValue) => void
  disabled?: boolean
}) {
  const columns = calendarFilterColumns(categories)
  const selectedKeys = selectedCalendarFilterCellKeys(value)
  const allCells = createShowAllCalendarFilter(members, categories).selectedCells

  function cell(memberId: string, categoryIndex: number): CalendarFilterCell {
    return { participantProfileId: memberId, category: columns[categoryIndex].identity }
  }

  return (
    <section className="calendar-filter-matrix" aria-label="Filtermatris för kalender">
      <div className="calendar-filter-matrix__global-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() => onChange({ selectedCells: allCells })}
        >
          Välj allt
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() => onChange({ selectedCells: [] })}
        >
          Avmarkera allt
        </button>
      </div>
      <div
        className="calendar-filter-matrix__scroll"
        tabIndex={0}
        aria-label="Rullbar filtermatris"
      >
        <table>
          <thead>
            <tr>
              <th scope="col" className="calendar-filter-matrix__member-heading">
                Person
              </th>
              {columns.map((column, categoryIndex) => {
                const columnCells = members.map((member) => cell(member.id, categoryIndex))
                const columnKey =
                  column.identity.kind === 'uncategorized' ? 'none' : column.identity.categoryId
                return (
                  <th scope="col" key={columnKey}>
                    <span>{column.label}</span>
                    <span className="calendar-filter-matrix__bulk-actions">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Välj ${column.label} för alla personer`}
                        onClick={() => onChange(setCalendarFilterCells(value, columnCells, true))}
                      >
                        Alla
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Avmarkera ${column.label} för alla personer`}
                        onClick={() => onChange(setCalendarFilterCells(value, columnCells, false))}
                      >
                        Ingen
                      </button>
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const rowCells = columns.map((_, categoryIndex) => cell(member.id, categoryIndex))
              return (
                <tr key={member.id}>
                  <th scope="row" className="calendar-filter-matrix__member-heading">
                    <span>{member.name}</span>
                    <span className="calendar-filter-matrix__bulk-actions">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Välj alla kategorier för ${member.name}`}
                        onClick={() => onChange(setCalendarFilterCells(value, rowCells, true))}
                      >
                        Välj alla
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Avmarkera alla kategorier för ${member.name}`}
                        onClick={() => onChange(setCalendarFilterCells(value, rowCells, false))}
                      >
                        Avmarkera alla
                      </button>
                    </span>
                  </th>
                  {columns.map((column, categoryIndex) => {
                    const current = cell(member.id, categoryIndex)
                    const checked = selectedKeys.has(calendarFilterCellKey(current))
                    const columnKey =
                      column.identity.kind === 'uncategorized' ? 'none' : column.identity.categoryId
                    return (
                      <td key={columnKey}>
                        <label className="calendar-filter-matrix__cell-toggle">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            aria-label={`${member.name} – ${column.label} – ${checked ? 'visas' : 'döljs'}`}
                            onChange={(event) =>
                              onChange(setCalendarFilterCell(value, current, event.target.checked))
                            }
                          />
                        </label>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
