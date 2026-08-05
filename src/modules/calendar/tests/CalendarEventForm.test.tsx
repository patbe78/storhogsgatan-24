import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarEventForm } from '../components/CalendarEventForm'
import { getCalendarPermissions } from '../utils/calendar-permissions'
import { felix } from './fixtures'

const props = {
  profiles: [{ id: felix.id, name: felix.name, color: felix.color }],
  categories: [],
  permissions: getCalendarPermissions(felix),
  busy: false,
  onSubmit: vi.fn(),
  onCancel: vi.fn()
}
describe('CalendarEventForm', () => {
  beforeEach(() => props.onSubmit.mockReset())
  it('visar svenska fel för obligatoriska fält', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spara' }))
    expect(screen.getByText('Ange en titel.')).toBeInTheDocument()
    expect(screen.getByText('Ange en beskrivning.')).toBeInTheDocument()
  })
  it('döljer tider för heldag och behåller ingen påminnelse', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.click(screen.getByLabelText('Heldagsaktivitet'))
    expect(screen.queryByLabelText('Starttid *')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Påminnelse')).toHaveValue('none')
  })
  it('visar återkomstformuläret', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.click(screen.getByLabelText('Återkommande aktivitet'))
    expect(screen.getByLabelText('Frekvens')).toBeInTheDocument()
    expect(screen.getByLabelText('Intervall')).toHaveValue(1)
  })
})
