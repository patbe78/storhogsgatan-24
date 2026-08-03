import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DashboardPage } from './index'
describe('DashboardPage', () => {
  it('visar dashboardens grundwidgetar', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )
    expect(screen.getByRole('heading', { name: 'Välkommen hem' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Idag' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Veckonummer' })).toBeInTheDocument()
  })
})
