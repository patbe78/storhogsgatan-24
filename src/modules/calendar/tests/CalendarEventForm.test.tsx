import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatInTimeZone } from 'date-fns-tz'
import { vi } from 'vitest'
import { CalendarEventForm } from '../components/CalendarEventForm'
import { CALENDAR_TIME_ZONE } from '../utils/calendar-dates'
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

async function fillRequiredTitle(title = 'Träning') {
  await userEvent.type(screen.getByLabelText('Titel *'), title)
}

async function chooseDuration(label: string) {
  await userEvent.click(screen.getByLabelText('Varaktighet *'))
  const sheet = screen.getByRole('dialog', { name: 'Varaktighet' })
  await userEvent.click(within(sheet).getByRole('button', { name: label }))
}

describe('CalendarEventForm', () => {
  beforeEach(() => props.onSubmit.mockReset())

  it('kräver titel och tar bort Beskrivning och Extern referens från UI', async () => {
    render(<CalendarEventForm {...props} />)

    expect(screen.queryByLabelText('Beskrivning')).not.toBeInTheDocument()
    expect(screen.queryByText('Extern referens')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Skapa aktivitet' }))
    expect(screen.getByText('Ange en titel.')).toBeInTheDocument()
  })

  it('fokuserar titeln och använder 1 timme som standard', () => {
    render(<CalendarEventForm {...props} />)
    expect(screen.getByLabelText('Titel *')).toHaveFocus()
    expect(screen.getByLabelText('Varaktighet *')).toHaveTextContent('1 timme')
    expect(screen.queryByLabelText('Sluttid *')).not.toBeInTheDocument()
  })

  it('beräknar slutet från start och vald preset', async () => {
    render(<CalendarEventForm {...props} initialDate="2026-08-10" />)
    await fillRequiredTitle()
    await userEvent.clear(screen.getByLabelText('Starttid *'))
    await userEvent.type(screen.getByLabelText('Starttid *'), '23:30')
    await chooseDuration('2 timmar')
    await userEvent.click(screen.getByRole('button', { name: 'Skapa aktivitet' }))

    const input = props.onSubmit.mock.calls[0][0]
    expect((Date.parse(input.endsAt) - Date.parse(input.startsAt)) / 60_000).toBe(120)
    expect(formatInTimeZone(input.endsAt, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2026-08-11 01:30'
    )
  })

  it('härleder preset och egen varaktighet vid redigering', () => {
    const { unmount } = render(
      <CalendarEventForm
        {...props}
        event={event({ startsAt: '2026-08-10T07:00:00.000Z', endsAt: '2026-08-10T08:30:00.000Z' })}
      />
    )
    expect(screen.getByLabelText('Varaktighet *')).toHaveTextContent('1 timme 30 minuter')
    unmount()

    render(
      <CalendarEventForm
        {...props}
        event={event({ startsAt: '2026-08-10T07:00:00.000Z', endsAt: '2026-08-10T07:17:00.000Z' })}
      />
    )
    expect(screen.getByLabelText('Varaktighet *')).toHaveTextContent('17 minuter')
  })

  it('blockerar egen varaktighet på noll och accepterar timmar plus minuter', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.click(screen.getByLabelText('Varaktighet *'))
    const sheet = screen.getByRole('dialog', { name: 'Varaktighet' })
    const hours = within(sheet).getByLabelText('Timmar')
    const minutes = within(sheet).getByLabelText('Minuter')
    await userEvent.clear(hours)
    await userEvent.type(hours, '0')
    await userEvent.clear(minutes)
    await userEvent.type(minutes, '0')
    expect(within(sheet).getByRole('button', { name: 'Använd egen tid' })).toBeDisabled()

    await userEvent.clear(hours)
    await userEvent.type(hours, '1')
    await userEvent.clear(minutes)
    await userEvent.type(minutes, '17')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Använd egen tid' }))
    expect(screen.getByLabelText('Varaktighet *')).toHaveTextContent('1 timme 17 minuter')
  })

  it('döljer starttid och varaktighet för heldag men behåller heldagsslut', async () => {
    render(<CalendarEventForm {...props} initialDate="2026-08-10" />)
    await userEvent.click(screen.getByLabelText('Heldagsaktivitet'))
    expect(screen.queryByLabelText('Starttid *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Varaktighet *')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Startdatum *')).toHaveValue('2026-08-10')
    expect(screen.getByLabelText('Slutdatum *')).toHaveValue('2026-08-10')
  })

  it('kan växla en befintlig heldagsaktivitet till vanlig aktivitet', async () => {
    render(
      <CalendarEventForm
        {...props}
        event={event({
          allDay: true,
          allDayStart: '2026-08-10',
          allDayEnd: '2026-08-10',
          startsAt: null,
          endsAt: null
        })}
      />
    )
    await userEvent.click(screen.getByLabelText('Heldagsaktivitet'))
    expect(screen.getByLabelText('Starttid *')).toHaveValue('09:00')
    expect(screen.getByLabelText('Varaktighet *')).toHaveTextContent('1 timme')
    await userEvent.click(screen.getByRole('button', { name: 'Spara' }))
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ allDay: false, allDayStart: null, allDayEnd: null })
    )
  })

  it('lägger till en egen reminder i minuter', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ingen påminnelse' }))
    const sheet = screen.getByRole('dialog', { name: 'Påminnelser' })
    const customValue = within(sheet).getByLabelText('Värde')
    await userEvent.clear(customValue)
    await userEvent.type(customValue, '17')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Lägg till påminnelse' }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Klar' }))
    await fillRequiredTitle()
    await userEvent.click(screen.getByRole('button', { name: 'Skapa aktivitet' }))
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ reminderOffsetsMinutes: [17] })
    )
  })

  it('skickar flera reminders och custom timmar/dagar utan dubletter', async () => {
    render(<CalendarEventForm {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ingen påminnelse' }))
    const sheet = screen.getByRole('dialog', { name: 'Påminnelser' })
    await userEvent.click(within(sheet).getByLabelText('5 minuter före'))
    await userEvent.click(within(sheet).getByLabelText('1 timme före'))

    const customValue = within(sheet).getByLabelText('Värde')
    const customUnit = within(sheet).getByLabelText('Enhet')
    await userEvent.clear(customValue)
    await userEvent.type(customValue, '3')
    await userEvent.selectOptions(customUnit, 'timmar')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Lägg till påminnelse' }))
    await userEvent.clear(customValue)
    await userEvent.type(customValue, '1')
    await userEvent.selectOptions(customUnit, 'dagar')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Lägg till påminnelse' }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Klar' }))

    await fillRequiredTitle()
    await userEvent.click(screen.getByRole('button', { name: 'Skapa aktivitet' }))
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ reminderOffsetsMinutes: [5, 60, 180, 1440] })
    )
  })

  it('visar och blockerar en custom reminder-dublett vid edit', async () => {
    render(<CalendarEventForm {...props} event={event({ reminderOffsetsMinutes: [17] })} />)
    await userEvent.click(screen.getByRole('button', { name: '17 minuter före' }))
    const sheet = screen.getByRole('dialog', { name: 'Påminnelser' })
    expect(within(sheet).getByLabelText('Anpassade påminnelser')).toHaveTextContent(
      '17 minuter före'
    )
    const input = within(sheet).getByLabelText('Värde')
    await userEvent.clear(input)
    await userEvent.type(input, '17')
    expect(within(sheet).getByRole('button', { name: 'Lägg till påminnelse' })).toBeDisabled()
  })

  it('bevarar legacy description och extern referens utan att visa fälten', async () => {
    render(
      <CalendarEventForm
        {...props}
        event={event({
          description: 'Legacy-beskrivning',
          externalSource: 'legacy-system',
          externalId: 'legacy-42'
        })}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Spara' }))
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Legacy-beskrivning',
        externalSource: 'legacy-system',
        externalId: 'legacy-42'
      })
    )
  })

  it('visar återkomstformuläret utan att ändra dess semantik', async () => {
    render(<CalendarEventForm {...props} />)
    const inactiveToggle = screen.getByLabelText('Återkommande aktivitet')
    expect(inactiveToggle.closest('label')).toHaveClass(
      'calendar-checkbox-row',
      'recurrence-toggle'
    )
    expect(inactiveToggle.closest('label')).not.toHaveClass('active')
    await userEvent.click(inactiveToggle)
    const activeToggle = screen.getByLabelText('Återkommande aktivitet')
    expect(activeToggle).toBeChecked()
    expect(activeToggle.closest('label')).toHaveClass('recurrence-toggle', 'active')
    expect(screen.getByLabelText('Frekvens')).toBeInTheDocument()
    expect(screen.getByLabelText('Intervall')).toHaveValue(1)
    expect(screen.getByRole('option', { name: 'Dagligen' })).toHaveValue('daily')
    expect(screen.getByRole('option', { name: 'Varje vecka' })).toHaveValue('weekly')
    expect(screen.getByRole('option', { name: 'Varje månad' })).toHaveValue('monthly')
    expect(screen.getByRole('option', { name: 'Varje år' })).toHaveValue('yearly')
    await userEvent.click(activeToggle)
    expect(screen.queryByLabelText('Frekvens')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Återkommande aktivitet').closest('label')).not.toHaveClass(
      'active'
    )
  })

  it('förhindrar dubbel-save medan requesten pågår', async () => {
    let resolveSubmit: (() => void) | undefined
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        })
    )
    render(<CalendarEventForm {...props} onSubmit={onSubmit} />)
    await fillRequiredTitle()
    const save = screen.getByRole('button', { name: 'Skapa aktivitet' })
    await userEvent.click(save)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Sparar…' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Sparar…' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    resolveSubmit?.()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Skapa aktivitet' })).toBeEnabled()
    )
  })
})
