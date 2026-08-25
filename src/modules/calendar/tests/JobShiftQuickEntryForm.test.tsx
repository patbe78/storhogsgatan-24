import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarDialog } from '../components/CalendarDialog'
import { JobShiftQuickEntryForm } from '../components/JobShiftQuickEntryForm'
import type { CalendarCategory } from '../types/calendar-category'
import { getCalendarPermissions } from '../utils/calendar-permissions'
import { felix, patrik } from './fixtures'

const workCategory: CalendarCategory = {
  id: '33333333-3333-4333-8333-333333333333',
  householdId: patrik.household_id!,
  name: 'Arbete',
  icon: 'briefcase',
  color: '#2563eb',
  isArchived: false,
  isSystem: true
}

function props(overrides: Partial<React.ComponentProps<typeof JobShiftQuickEntryForm>> = {}) {
  return {
    profiles: [
      { id: patrik.id, name: patrik.name, color: patrik.color },
      { id: felix.id, name: felix.name, color: felix.color }
    ],
    categories: [workCategory],
    permissions: getCalendarPermissions(patrik),
    busy: false,
    success: false,
    error: '',
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    ...overrides
  }
}

describe('JobShiftQuickEntryForm', () => {
  it('öppnar dialogen utan att fokusera datumfältet men låter användaren aktivera det', async () => {
    render(
      <CalendarDialog title="Lägg till jobbpass" open onClose={vi.fn()}>
        <JobShiftQuickEntryForm {...props()} />
      </CalendarDialog>
    )

    const date = screen.getByLabelText('Startdatum *')
    expect(screen.getByRole('button', { name: 'Stäng' })).toHaveFocus()
    expect(date).not.toHaveFocus()

    await userEvent.click(date)
    expect(date).toHaveFocus()
  })

  it('visar rätt standardvärden och endast det fokuserade snabbflödet', () => {
    render(<JobShiftQuickEntryForm {...props()} />)

    expect(screen.queryByText('Titel *')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Deltagare *' })).toHaveTextContent('Patrik')
    expect((screen.getByLabelText('Startdatum *') as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    )
    expect(screen.getByLabelText('Starttid *')).toHaveValue('09:00')
    expect(screen.getByLabelText('Sluttid *')).toHaveValue('17:00')
    expect(screen.getAllByRole('button', { name: /timmar$/ })).toHaveLength(5)
    expect(screen.getByRole('button', { name: /Återkommande Ingen återkommande/ })).toBeVisible()
    expect(screen.queryByText('Till och med vecka')).not.toBeInTheDocument()
    expect(screen.queryByText('Kategori')).not.toBeInTheDocument()
    expect(screen.queryByText('Plats')).not.toBeInTheDocument()
    expect(screen.queryByText('Påminnelser')).not.toBeInTheDocument()
    expect(screen.queryByText('Anteckning')).not.toBeInTheDocument()
  })

  it('synkroniserar fri sluttid och preset i båda riktningarna', async () => {
    render(<JobShiftQuickEntryForm {...props()} />)
    fireEvent.change(screen.getByLabelText('Startdatum *'), { target: { value: '2026-08-18' } })
    fireEvent.change(screen.getByLabelText('Starttid *'), { target: { value: '07:00' } })
    expect(screen.getByLabelText('Sluttid *')).toHaveValue('15:00')

    fireEvent.change(screen.getByLabelText('Sluttid *'), { target: { value: '15:30' } })
    expect(screen.getByText('Faktisk varaktighet: 8 timmar 30 minuter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '8 timmar' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    await userEvent.click(screen.getByRole('button', { name: '8 timmar' }))
    expect(screen.getByLabelText('Sluttid *')).toHaveValue('15:00')
    expect(screen.getByRole('button', { name: '8 timmar' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sparar med Arbete-ID och tomma valfria fält utan att återställa state', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const view = render(<JobShiftQuickEntryForm {...props({ onSubmit })} />)
    fireEvent.change(screen.getByLabelText('Startdatum *'), { target: { value: '2026-08-21' } })
    fireEvent.change(screen.getByLabelText('Starttid *'), { target: { value: '21:30' } })
    fireEvent.change(screen.getByLabelText('Sluttid *'), { target: { value: '05:30' } })
    await userEvent.click(screen.getByRole('button', { name: 'Spara', exact: true }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Jobb',
      categoryId: workCategory.id,
      location: '',
      notes: '',
      reminderOffsetsMinutes: [],
      recurrence: null,
      participantIds: [patrik.id]
    })
    expect(
      Date.parse(onSubmit.mock.calls[0][0].endsAt) - Date.parse(onSubmit.mock.calls[0][0].startsAt)
    ).toBe(8 * 60 * 60_000)

    view.rerender(<JobShiftQuickEntryForm {...props({ onSubmit, success: true })} />)
    expect(screen.getByText('Jobbpass sparat')).toBeInTheDocument()
    expect(screen.queryByText('Titel *')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Startdatum *')).toHaveValue('2026-08-21')
    expect(screen.getByLabelText('Starttid *')).toHaveValue('21:30')
    expect(screen.getByLabelText('Sluttid *')).toHaveValue('05:30')
  })

  it('väljer exakt en deltagare och ersätter det tidigare valet', async () => {
    render(<JobShiftQuickEntryForm {...props()} />)
    const participantGroup = screen.getByRole('group', { name: 'Deltagare *' })
    await userEvent.click(within(participantGroup).getByRole('button', { name: 'Patrik' }))
    const radios = screen.getAllByRole('radio', { name: /Patrik|Felix/ })
    expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1)

    await userEvent.click(screen.getByRole('radio', { name: 'Felix' }))
    expect(screen.getByRole('radio', { name: 'Patrik' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Felix' })).toBeChecked()
    expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Klar' }))
    expect(within(participantGroup).getByRole('button', { name: 'Felix' })).toBeVisible()
  })

  it('sparar vardagar som en weekly-serie och behåller recurrence-state', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const view = render(<JobShiftQuickEntryForm {...props({ onSubmit })} />)
    fireEvent.change(screen.getByLabelText('Startdatum *'), { target: { value: '2026-08-26' } })
    await userEvent.click(screen.getByRole('button', { name: /Återkommande Ingen återkommande/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Varje vardag (mån–fre)' }))
    expect(screen.getByText('Till och med vecka')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Till och med vecka V35 2026/ })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: /Till och med vecka V35 2026/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'V36 2026' }))
    await userEvent.click(screen.getByRole('button', { name: 'Spara', exact: true }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Jobb',
      recurrence: {
        frequency: 'weekly',
        intervalValue: 1,
        weekdays: [1, 2, 3, 4, 5],
        endsOn: '2026-09-06',
        occurrenceCount: null
      }
    })
    view.rerender(<JobShiftQuickEntryForm {...props({ onSubmit, success: true })} />)
    expect(screen.getByRole('button', { name: /Återkommande Varje vardag/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Till och med vecka V36 2026/ })).toBeVisible()
  })

  it('blockerar save om systemkategorin Arbete saknas', async () => {
    const onSubmit = vi.fn()
    render(<JobShiftQuickEntryForm {...props({ categories: [], onSubmit })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spara', exact: true }))
    expect(screen.getByText(/Systemkategorin Arbete kunde inte hittas/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('förhindrar parallell dubbel-submit', async () => {
    let resolveSave = () => undefined
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (resolveSave = resolve)))
    render(<JobShiftQuickEntryForm {...props({ onSubmit })} />)
    const save = screen.getByRole('button', { name: 'Spara', exact: true })
    await userEvent.click(save)
    expect(screen.getByRole('button', { name: 'Sparar…' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Sparar…' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await act(async () => resolveSave())
  })
})
