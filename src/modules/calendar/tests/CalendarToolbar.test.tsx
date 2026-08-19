import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarToolbar } from '../components/CalendarToolbar'

describe('CalendarToolbar', () => {
  it('byter vy och navigerar', async () => {
    const user = userEvent.setup()
    const onView = vi.fn()
    const onNext = vi.fn()
    render(
      <CalendarToolbar
        title="augusti 2026"
        view="month"
        onView={onView}
        onPrevious={vi.fn()}
        onNext={onNext}
        onToday={vi.fn()}
        onCreate={vi.fn()}
        onCreateJobShift={vi.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Vecka' }))
    await user.click(screen.getByRole('button', { name: 'Nästa period' }))
    expect(onView).toHaveBeenCalledWith('week')
    expect(onNext).toHaveBeenCalled()
  })
})
