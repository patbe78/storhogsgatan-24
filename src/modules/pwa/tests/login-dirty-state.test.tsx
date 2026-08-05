import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/modules/auth'
import { usePwa } from '../PwaContext'
import { PwaProvider } from '../PwaProvider'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signInWithPassword: vi.fn()
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mocks.navigate }
})

vi.mock('@/shared/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword
    }
  }
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn()
  })
}))

function LoginHarness() {
  const [showLogin, setShowLogin] = useState(true)
  const { hasUnsavedChanges } = usePwa()
  return (
    <>
      {showLogin && <LoginPage />}
      <output aria-label="dirty-status">{String(hasUnsavedChanges)}</output>
      <button type="button" onClick={() => setShowLogin(false)}>
        Avmontera login
      </button>
    </>
  )
}

function renderLogin() {
  return render(
    <MemoryRouter>
      <PwaProvider>
        <LoginHarness />
      </PwaProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  mocks.navigate.mockReset()
  mocks.signInWithPassword.mockReset()
  mocks.signInWithPassword.mockResolvedValue({ error: null })
})

describe('osparad logininformation', () => {
  it('registrerar endast dirty-status och rensar den vid reset och avmontering', async () => {
    const user = userEvent.setup()
    renderLogin()
    const email = screen.getByLabelText('E-post')
    const password = screen.getByLabelText('Lösenord')

    await user.type(email, 'hemlig@example.test')
    await user.type(password, 'mycket-hemligt')
    expect(screen.getByLabelText('dirty-status')).toHaveTextContent('true')
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(
      'hemlig@example.test'
    )
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('mycket-hemligt')

    email.closest('form')?.reset()
    await waitFor(() => expect(screen.getByLabelText('dirty-status')).toHaveTextContent('false'))

    await user.type(email, 'ny@example.test')
    expect(screen.getByLabelText('dirty-status')).toHaveTextContent('true')
    await user.click(screen.getByRole('button', { name: 'Avmontera login' }))
    await waitFor(() => expect(screen.getByLabelText('dirty-status')).toHaveTextContent('false'))
  })

  it('rensar dirty-status vid lyckad login utan att lagra inloggningsvärden', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('E-post'), 'person@example.test')
    await user.type(screen.getByLabelText('Lösenord'), 'inte-lagra-detta')
    expect(screen.getByLabelText('dirty-status')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'Logga in' }))

    await waitFor(() => expect(screen.getByLabelText('dirty-status')).toHaveTextContent('false'))
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.test',
      password: 'inte-lagra-detta'
    })
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true })
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(
      'person@example.test'
    )
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('inte-lagra-detta')
  })
})
