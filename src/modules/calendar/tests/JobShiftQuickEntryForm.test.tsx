import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
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
  it('visar rätt standardvärden och endast det fokuserade snabbflödet', () => {
    render(<JobShiftQuickEntryForm {...props()} />)

    expect(screen.getByLabelText('Titel *')).toHaveValue('Jobb')
    expect(screen.getByRole('group', { name: 'Deltagare *' })).toHaveTextContent('Patrik')
    expect((screen.getByLabelText('Startdatum *') as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    )
    expect(screen.getByLabelText('Starttid *')).toHaveValue('09:00')
    expect(screen.getByLabelText('Sluttid *')).toHaveValue('17:00')
    expect(screen.getAllByRole('button', { name: /timmar$/ })).toHaveLength(5)
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
    await userEvent.clear(screen.getByLabelText('Titel *'))
    await userEvent.type(screen.getByLabelText('Titel *'), 'Nattpass')
    fireEvent.change(screen.getByLabelText('Startdatum *'), { target: { value: '2026-08-21' } })
    fireEvent.change(screen.getByLabelText('Starttid *'), { target: { value: '21:30' } })
    fireEvent.change(screen.getByLabelText('Sluttid *'), { target: { value: '05:30' } })
    await userEvent.click(screen.getByRole('button', { name: 'Spara', exact: true }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Nattpass',
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
    expect(screen.getByLabelText('Titel *')).toHaveValue('Nattpass')
    expect(screen.getByLabelText('Startdatum *')).toHaveValue('2026-08-21')
    expect(screen.getByLabelText('Starttid *')).toHaveValue('21:30')
    expect(screen.getByLabelText('Sluttid *')).toHaveValue('05:30')
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
