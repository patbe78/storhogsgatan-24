import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarDialog } from '../components/CalendarDialog'
import { CalendarPickerSheet } from '../components/CalendarPickerSheet'
import { CalendarConflictWarning } from '../components/CalendarConflictWarning'
import { RecurringEventActionDialog } from '../components/RecurringEventActionDialog'
import { singleOccurrence } from '../utils/calendar-recurrence'
import { event, felix } from './fixtures'

describe('calendar dialogs', () => {
  it('återställer global scroll när en dialog med öppet sheet unmountas', () => {
    const nested = (sheetOpen: boolean) => (
      <CalendarDialog title="Ny aktivitet" open onClose={vi.fn()}>
        <CalendarPickerSheet title="Deltagare" open={sheetOpen} onClose={vi.fn()}>
          Innehåll
        </CalendarPickerSheet>
      </CalendarDialog>
    )
    const view = render(nested(false))
    view.rerender(nested(true))

    expect(document.body.style.overflow).toBe('hidden')
    view.unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('fokuserar markerat titelfält och behåller Escape samt fokusfälla', async () => {
    const onClose = vi.fn()
    render(
      <CalendarDialog title="Ny aktivitet" open onClose={onClose}>
        <input aria-label="Titel" data-calendar-dialog-initial-focus />
        <button type="button">Sista knapp</button>
      </CalendarDialog>
    )

    expect(screen.getByLabelText('Titel')).toHaveFocus()
    screen.getByRole('button', { name: 'Sista knapp' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Stäng' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('låter användaren spara trots konflikt', async () => {
    const onSave = vi.fn()
    render(
      <CalendarConflictWarning
        conflicts={[
          {
            participantId: felix.id,
            participantName: felix.name,
            conflictingOccurrence: singleOccurrence(event())
          }
        ]}
        onSave={onSave}
        onBack={vi.fn()}
      />
    )
    expect(screen.getByText(/Felix har redan/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Spara ändå' }))
    expect(onSave).toHaveBeenCalled()
  })
  it('erbjuder endast hela serien och denna och framtida', () => {
    render(
      <RecurringEventActionDialog
        action="redigera"
        onSeries={vi.fn()}
        onFuture={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Hela serien' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Denna och framtida' })).toBeInTheDocument()
    expect(screen.queryByText('Endast denna förekomst')).not.toBeInTheDocument()
  })
})
