import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { OnboardingDialog } from '@/modules/pwa'
import { navigationItems } from '@/shared/components/navigation'
import { useAuth } from '@/modules/auth'
export function AppShell() {
  const [open, setOpen] = useState(false)
  const { signOut } = useAuth()
  const links = (
    <nav aria-label="Huvudnavigering">
      {navigationItems.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          onClick={() => setOpen(false)}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Icon size={19} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
  return (
    <div className="app-shell">
      <header className="header">
        <button
          className="menu-button"
          aria-label={open ? 'Stäng meny' : 'Öppna meny'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <strong>Storhogsgatan 24</strong>
        <button className="text-button" onClick={() => void signOut()}>
          Logga ut
        </button>
      </header>
      <aside className={open ? 'sidebar open' : 'sidebar'}>{links}</aside>
      {open && (
        <button className="backdrop" aria-label="Stäng meny" onClick={() => setOpen(false)} />
      )}
      <main className="content">
        <Outlet />
      </main>
      <OnboardingDialog />
    </div>
  )
}
