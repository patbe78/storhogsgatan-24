import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarCategoryManager } from '../components/CalendarCategoryManager'

vi.mock('../services/calendar-category.service', () => ({
  saveCalendarCategory: vi.fn().mockResolvedValue('id')
}))
describe('CalendarCategoryManager', () => {
  it('kan välja ikon och börja redigera kategori', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CalendarCategoryManager
          categories={[
            {
              id: '1',
              householdId: 'h',
              name: 'Arbete',
              icon: 'briefcase',
              color: '#123456',
              isArchived: false,
              isSystem: true
            }
          ]}
        />
      </QueryClientProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ändra' }))
    expect(screen.getByLabelText('Namn')).toHaveValue('Arbete')
    expect(screen.getByLabelText('Ikon')).toHaveValue('briefcase')
    expect(screen.getByRole('button', { name: 'Spara' })).toBeInTheDocument()
  })
})
