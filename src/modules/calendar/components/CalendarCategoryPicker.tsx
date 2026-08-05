import type { CalendarCategory } from '../types/calendar-category'

export function CalendarCategoryPicker({
  categories,
  value,
  editing,
  onChange
}: {
  categories: CalendarCategory[]
  value: string
  editing: boolean
  onChange: (id: string) => void
}) {
  return (
    <label>
      Kategori
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Ingen kategori</option>
        {categories
          .filter((category) => !category.isArchived || (editing && category.id === value))
          .map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.isArchived ? ' (arkiverad)' : ''}
            </option>
          ))}
      </select>
    </label>
  )
}
