import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CalendarCategory } from '../types/calendar-category'
import { saveCalendarCategory } from '../services/calendar-category.service'
import { useUnsavedChanges } from '@/modules/pwa/hooks/useUnsavedChanges'

export function CalendarCategoryManager({ categories }: { categories: CalendarCategory[] }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#64748b')
  const [icon, setIcon] = useState('calendar')
  const [editing, setEditing] = useState<CalendarCategory | null>(null)
  const [dirty, setDirty] = useState(false)
  useUnsavedChanges(dirty)
  const reset = () => {
    setName('')
    setColor('#64748b')
    setIcon('calendar')
    setEditing(null)
    setDirty(false)
  }
  const mutation = useMutation({
    mutationFn: saveCalendarCategory,
    onSuccess: async () => {
      reset()
      await queryClient.invalidateQueries({ queryKey: ['calendar-categories'] })
    }
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() && name.length <= 50)
      mutation.mutate({
        id: editing?.id,
        name: name.trim(),
        color,
        icon,
        isArchived: editing?.isArchived
      })
  }
  function edit(category: CalendarCategory) {
    setEditing(category)
    setName(category.name)
    setColor(category.color || '#64748b')
    setIcon(category.icon || 'calendar')
  }
  return (
    <section className="category-manager">
      <h2>Kategorier</h2>
      <form
        onSubmit={submit}
        onChangeCapture={() => setDirty(true)}
        onReset={() => setDirty(false)}
        className="form-row"
      >
        <label>
          Namn
          <input required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Ikon
          <select value={icon} onChange={(e) => setIcon(e.target.value)}>
            <option value="calendar">Kalender</option>
            <option value="briefcase">Portfölj</option>
            <option value="cake">Tårta</option>
            <option value="heart">Hjärta</option>
            <option value="star">Stjärna</option>
          </select>
        </label>
        <label>
          Färg
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <button className="primary-button" type="submit">
          {editing ? 'Spara' : 'Skapa'}
        </button>
        {editing && (
          <button type="button" className="secondary-button" onClick={reset}>
            Avbryt
          </button>
        )}
      </form>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            <span className="color-dot" style={{ background: category.color || '#64748b' }} />
            {category.name}
            <button type="button" className="text-button" onClick={() => edit(category)}>
              Ändra
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                mutation.mutate({
                  id: category.id,
                  name: category.name,
                  icon: category.icon,
                  color: category.color,
                  isArchived: !category.isArchived
                })
              }
            >
              {category.isArchived ? 'Återaktivera' : 'Arkivera'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
