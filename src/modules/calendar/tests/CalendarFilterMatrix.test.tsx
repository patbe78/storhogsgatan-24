import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarFilterMatrix } from '../components/CalendarFilterMatrix'
import type { CalendarFilterMatrixValue } from '../types/calendar-filter'
import { felix, patrik } from './fixtures'

const members = [
  { id: patrik.id, name: patrik.name, color: patrik.color },
  { id: felix.id, name: felix.name, color: felix.color }
]
const categories = [
  {
    id: 'aaaaaaaa-1111-4111-8111-111111111111',
    householdId: patrik.household_id!,
    name: 'Arbete',
    icon: null,
    color: null,
    isArchived: false,
    isSystem: true
  }
]

function Matrix({ initial = { selectedCells: [] } }: { initial?: CalendarFilterMatrixValue }) {
  const [value, setValue] = useState(initial)
  return (
    <CalendarFilterMatrix
      members={members}
      categories={categories}
      value={value}
      onChange={setValue}
    />
  )
}

describe('CalendarFilterMatrix', () => {
  it('visar Ingen kategori som virtuell kolumn och ändrar celler direkt', async () => {
    render(<Matrix />)
    const checkbox = screen.getByLabelText('Patrik – Ingen kategori – döljs')
    await userEvent.click(checkbox)
    expect(screen.getByLabelText('Patrik – Ingen kategori – visas')).toBeChecked()
  })

  it('väljer och avmarkerar hela matrisen inklusive Ingen kategori', async () => {
    render(<Matrix />)
    await userEvent.click(screen.getByRole('button', { name: 'Välj allt', exact: true }))
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Avmarkera allt', exact: true }))
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).not.toBeChecked()
  })

  it('har bulk actions per person och per kategori', async () => {
    render(<Matrix />)
    await userEvent.click(screen.getByRole('button', { name: 'Välj alla kategorier för Felix' }))
    const felixRow = screen.getByRole('rowheader', { name: /Felix/ }).closest('tr')!
    for (const checkbox of within(felixRow).getAllByRole('checkbox')) expect(checkbox).toBeChecked()

    await userEvent.click(
      screen.getByRole('button', { name: 'Avmarkera Ingen kategori för alla personer' })
    )
    expect(screen.getByLabelText('Felix – Ingen kategori – döljs')).not.toBeChecked()
    expect(screen.getByLabelText('Felix – Arbete – visas')).toBeChecked()
  })
})
