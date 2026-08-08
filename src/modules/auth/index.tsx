import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AppIcon, InstallAppButton, useUnsavedChanges } from '@/modules/pwa'
import { supabase } from '@/shared/services/supabase'
import {
  clearLocalPushBinding,
  deactivateCurrentInstallation,
  logSanitizedPushCleanupFailure,
  rebindExistingPushSubscription,
  unsubscribeCurrentPushSubscription
} from '@/modules/notifications'
type AuthContextValue = { session: Session | null; loading: boolean; signOut: () => Promise<void> }
const PUSH_CLEANUP_TIMEOUT_MS = 3000

function boundedPushCleanup<T>(operation: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('push_cleanup_timeout')),
      PUSH_CLEANUP_TIMEOUT_MS
    )
    operation.then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timeout)
        reject(error)
      }
    )
  })
}

const AuthContext = createContext<AuthContextValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session)
        void rebindExistingPushSubscription().catch(() =>
          logSanitizedPushCleanupFailure('initial_rebind')
        )
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' && next)
        void rebindExistingPushSubscription().catch(() =>
          logSanitizedPushCleanupFailure('signed_in_rebind')
        )
    })
    return () => listener.subscription.unsubscribe()
  }, [])
  const value = useMemo(
    () => ({
      session,
      loading,
      signOut: async () => {
        try {
          await boundedPushCleanup(clearLocalPushBinding())
        } catch {
          logSanitizedPushCleanupFailure('local_binding')
        }
        const cleanup = await Promise.allSettled([
          boundedPushCleanup(unsubscribeCurrentPushSubscription()),
          boundedPushCleanup(deactivateCurrentInstallation())
        ])
        if (cleanup[0].status === 'rejected') logSanitizedPushCleanupFailure('local_unsubscribe')
        if (cleanup[1].status === 'rejected') logSanitizedPushCleanupFailure('server_deactivate')
        await supabase?.auth.signOut()
      }
    }),
    [session, loading]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth måste användas inom AuthProvider')
  return value
}
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="centered">Laddar…</main>
  return session ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}
export function LoginPage() {
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  useUnsavedChanges(dirty)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (!supabase) {
      setMessage('Ange Supabase-variabler i .env för att logga in.')
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: String(data.get('email')),
      password: String(data.get('password'))
    })
    if (error) {
      setMessage(error.message)
    } else {
      setDirty(false)
      const from = (location.state as { from?: { pathname?: string; search?: string } } | null)
        ?.from
      navigate(from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/', { replace: true })
    }
  }
  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={submit}
        onChangeCapture={() => setDirty(true)}
        onReset={() => setDirty(false)}
      >
        <AppIcon />
        <p className="eyebrow">Storhogsgatan 24</p>
        <h1>Välkommen hem</h1>
        <p>Familjens kalender och vardag på ett ställe.</p>
        <label>
          E-post
          <input required name="email" type="email" autoComplete="email" />
        </label>
        <label>
          Lösenord
          <input required name="password" type="password" autoComplete="current-password" />
        </label>
        <button type="submit">Logga in</button>
        <InstallAppButton />
        <a href="/aterstall-losenord">Glömt lösenordet?</a>
        {message && <p role="alert">{message}</p>}
      </form>
    </main>
  )
}
export function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Återställ lösenord</h1>
        <p>Funktionen kopplas till Supabase när miljövariabler har konfigurerats.</p>
        <a href="/login">Tillbaka till inloggning</a>
      </section>
    </main>
  )
}
