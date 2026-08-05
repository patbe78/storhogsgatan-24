import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarEventForm } from '../components/CalendarEventForm'
import { getCalendarPermissions } from '../utils/calendar-permissions'
import { event, felix } from './fixtures'

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

  it('kräver titel men visar beskrivning som frivillig', async () => {
    render(<CalendarEventForm {...props} />)
    const description = screen.getByLabelText('Beskrivning')

    expect(description).not.toBeRequired()
    expect(description).toHaveAttribute('rows', '2')
    expect(screen.queryByText('Beskrivning *')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Skapa aktivitet' }))
    expect(screen.getByText('Ange en titel.')).toBeInTheDocument()
    expect(screen.queryByText('Ange en beskrivning.')).not.toBeInTheDocument()
  })

  it('skickar tom beskrivning som tom sträng', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.type(screen.getByLabelText('Titel *'), 'Träning')
    await userEvent.click(screen.getByRole('button', { name: 'Skapa aktivitet' }))

    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: '' }))
  })

  it('trimmar en beskrivning med endast blanksteg till tom sträng', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.type(screen.getByLabelText('Titel *'), 'Träning')
    await userEvent.type(screen.getByLabelText('Beskrivning'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Skapa aktivitet' }))

    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: '' }))
  })

  it('fokuserar titeln när formuläret öppnas', () => {
    render(<CalendarEventForm {...props} />)
    expect(screen.getByLabelText('Titel *')).toHaveFocus()
  })

  it('autojusterar beskrivningen även för ett befintligt event', () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollHeight'
    )
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 240
    })

    try {
      render(<CalendarEventForm {...props} event={event()} />)
      expect(screen.getByLabelText('Beskrivning')).toHaveStyle({
        height: '180px',
        overflowY: 'auto'
      })
    } finally {
      if (originalScrollHeight)
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight)
      else delete (HTMLElement.prototype as unknown as { scrollHeight?: number }).scrollHeight
    }
  })

  it('döljer tider för heldag och behåller ingen påminnelse', async () => {
    render(<CalendarEventForm {...props} />)
    const allDay = screen.getByLabelText('Heldagsaktivitet')
    expect(allDay).toHaveAttribute('type', 'checkbox')
    expect(screen.getAllByLabelText('Tid *')).toHaveLength(2)

    await userEvent.click(allDay)
    expect(screen.queryByLabelText('Tid *')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Påminnelse')).toHaveValue('none')
  })

  it('redigerar ett event med tom beskrivning', async () => {
    render(<CalendarEventForm {...props} event={event({ description: '' })} />)
    expect(screen.getByLabelText('Beskrivning')).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: 'Spara' }))
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: '' }))
  })

  it('visar återkomstformuläret', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.click(screen.getByLabelText('Återkommande aktivitet'))
    expect(screen.getByLabelText('Frekvens')).toBeInTheDocument()
    expect(screen.getByLabelText('Intervall')).toHaveValue(1)
  })
})
