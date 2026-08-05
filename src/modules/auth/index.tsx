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
type AuthContextValue = { session: Session | null; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])
  const value = useMemo(
    () => ({
      session,
      loading,
      signOut: async () => {
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
      navigate('/', { replace: true })
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
