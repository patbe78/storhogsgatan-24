import { useLayoutEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useInvitationAcceptance } from '../hooks/useInvitationAcceptance'
import { tokenFromLocation } from '../utils/invitation-validation'

export function AcceptInvitationPage() {
  const [token] = useState(() => tokenFromLocation(window.location.search, window.location.hash))
  const { preview, loading, submitting, message, complete, accept, signInAndAccept } =
    useInvitationAcceptance(token)

  useLayoutEffect(() => {
    if (window.location.search || window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname)
    }
  }, [])

  function passwordFrom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    return String(new FormData(event.currentTarget).get('password') ?? '')
  }

  if (loading)
    return (
      <main className="auth-page">
        <section className="auth-card">Laddar inbjudan…</section>
      </main>
    )
  if (!preview)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Inbjudan</h1>
          <p role="alert">{message}</p>
          <Link to="/login">Till login</Link>
        </section>
      </main>
    )

  return (
    <main className="auth-page invitation-accept-page">
      <section className="auth-card">
        <p className="eyebrow">{preview.householdName}</p>
        <h1>Välkommen {preview.name}</h1>
        <p>Du är inbjuden som {preview.role === 'adult' ? 'vuxen' : 'familjemedlem'}.</p>
        <p>
          <strong>E-post:</strong> {preview.email}
        </p>
        {!complete && preview.accountExists && (
          <form onSubmit={(event) => void signInAndAccept(passwordFrom(event))}>
            <label>
              Lösenord för ditt befintliga konto
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={submitting}
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Ansluter…' : 'Logga in och acceptera'}
            </button>
          </form>
        )}
        {!complete && !preview.accountExists && (
          <form onSubmit={(event) => void accept(passwordFrom(event))}>
            <label>
              Välj lösenord
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={submitting}
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Skapar konto…' : 'Skapa konto och acceptera'}
            </button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        {complete && <Link to="/login">Gå till login</Link>}
      </section>
    </main>
  )
}
