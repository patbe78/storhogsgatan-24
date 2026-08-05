import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarFilters } from '../components/CalendarFilters'
import { EMPTY_CALENDAR_FILTERS } from '../types/calendar-filter'
import { felix } from './fixtures'

describe('CalendarFilters', () => {
  it('aktiverar Mina aktiviteter', async () => {
    const onMine = vi.fn()
    render(
      <CalendarFilters
        filters={EMPTY_CALENDAR_FILTERS}
        profiles={[{ id: felix.id, name: felix.name, color: felix.color }]}
        categories={[]}
        onParticipant={vi.fn()}
        onCategory={vi.fn()}
        onMine={onMine}
        onFamily={vi.fn()}
        onClear={vi.fn()}
      />
    )
    await userEvent.click(screen.getByLabelText('Mina aktiviteter'))
    expect(onMine).toHaveBeenCalledWith(true)
  })
})
