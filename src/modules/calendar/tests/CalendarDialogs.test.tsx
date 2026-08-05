import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarConflictWarning } from '../components/CalendarConflictWarning'
import { RecurringEventActionDialog } from '../components/RecurringEventActionDialog'
import { singleOccurrence } from '../utils/calendar-recurrence'
import { event, felix } from './fixtures'

describe('calendar dialogs', () => {
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
