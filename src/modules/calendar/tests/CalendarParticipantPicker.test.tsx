import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalendarParticipantPicker } from '../components/CalendarParticipantPicker'
import { felix, patrik } from './fixtures'

const profiles = [
  { id: felix.id, name: felix.name, color: felix.color },
  { id: patrik.id, name: patrik.name, color: patrik.color }
]

describe('CalendarParticipantPicker', () => {
  it('separerar hela familjen och väljer alla profiler', async () => {
    const onFamily = vi.fn()
    const onSelected = vi.fn()
    const { container } = render(
      <CalendarParticipantPicker
        profiles={profiles}
        selected={[patrik.id]}
        family={false}
        allowFamily
        onFamily={onFamily}
        onSelected={onSelected}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: patrik.name }))
    const family = screen.getByLabelText('Hela familjen')
    expect(family.closest('.family-participant-option')).toBeInTheDocument()
    expect(container.querySelector('.participant-picker')).toBeInTheDocument()

    await userEvent.click(family)
    expect(onFamily).toHaveBeenCalledWith(true)
    expect(onSelected).toHaveBeenCalledWith([felix.id, patrik.id])
  })

  it('använder profilernas färger och behåller namnen som identifiering', async () => {
    const { container } = render(
      <CalendarParticipantPicker
        profiles={profiles}
        selected={[]}
        family={false}
        allowFamily
        onFamily={vi.fn()}
        onSelected={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Välj deltagare' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Välj deltagare' }))
    expect(screen.getByText(felix.name)).toBeInTheDocument()
    expect(screen.getByText(patrik.name)).toBeInTheDocument()
    const dots = [...container.querySelectorAll<HTMLElement>('.participant-color-dot')]
    expect(dots[0]).toHaveStyle({ background: felix.color! })
    expect(dots[1]).toHaveStyle({ background: patrik.color! })
    expect(dots.every((dot) => dot.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('visar inte hela familjen när rollen saknar behörighet', async () => {
    render(
      <CalendarParticipantPicker
        profiles={profiles}
        selected={[felix.id]}
        family={false}
        allowFamily={false}
        onFamily={vi.fn()}
        onSelected={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: felix.name }))
    expect(screen.queryByLabelText('Hela familjen')).not.toBeInTheDocument()
    expect(screen.getByLabelText(felix.name)).toBeEnabled()
  })

  it('sammanfattar flera deltagare och tillåter avmarkering', async () => {
    const onSelected = vi.fn()
    render(
      <CalendarParticipantPicker
        profiles={profiles}
        selected={[felix.id, patrik.id]}
        family={false}
        allowFamily
        onFamily={vi.fn()}
        onSelected={onSelected}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: `${felix.name} + ${patrik.name}` }))
    await userEvent.click(screen.getByLabelText(felix.name))
    expect(onSelected).toHaveBeenCalledWith([patrik.id])
  })

  it('visar bara profiler som skickats in som valbara', async () => {
    render(
      <CalendarParticipantPicker
        profiles={[profiles[0]]}
        selected={[felix.id]}
        family={false}
        allowFamily={false}
        onFamily={vi.fn()}
        onSelected={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: felix.name }))
    expect(screen.getByLabelText(felix.name)).toBeVisible()
    expect(screen.queryByLabelText(patrik.name)).not.toBeInTheDocument()
  })
})
