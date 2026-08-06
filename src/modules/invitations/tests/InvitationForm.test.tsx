import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InvitationForm } from '../components/InvitationForm'
import { createInvitation } from '../services/invitation.service'

vi.mock('../services/invitation.service', () => ({ createInvitation: vi.fn() }))

describe('InvitationForm', () => {
  it('validerar och blockerar dubbel submit medan anrop pågår', async () => {
    let resolve!: () => void
    vi.mocked(createInvitation).mockReturnValue(
      new Promise<void>((done) => {
        resolve = done
      })
    )
    const user = userEvent.setup()
    render(<InvitationForm onCreated={vi.fn().mockResolvedValue(undefined)} />)
    await user.type(screen.getByLabelText('Namn'), 'Åsa')
    await user.type(screen.getByLabelText('E-post'), 'asa@example.com')
    await user.click(screen.getByRole('button', { name: 'Skicka inbjudan' }))
    expect(screen.getByRole('button', { name: 'Skickar…' })).toBeDisabled()
    expect(createInvitation).toHaveBeenCalledTimes(1)
    resolve()
  })
})
