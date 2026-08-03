import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
export function Widget({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="widget">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
export function DateWidget() {
  const today = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date())
  return (
    <Widget title="Idag">
      <p className="date-value">{today}</p>
    </Widget>
  )
}
export function WeekWidget() {
  const now = new Date()
  const first = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7)
  return (
    <Widget title="Veckonummer">
      <p className="metric">Vecka {week}</p>
    </Widget>
  )
}
export function FamilyWidget() {
  return (
    <Widget title="Familjen idag">
      <p className="muted">Familjeöversikt kommer snart.</p>
    </Widget>
  )
}
export function EventsWidget() {
  return (
    <Widget title="Kommande aktiviteter">
      <p className="muted">Inga aktiviteter att visa ännu.</p>
    </Widget>
  )
}
export function ShortcutsWidget() {
  return (
    <Widget title="Snabbgenvägar">
      <div className="shortcuts">
        <Link to="/kalender">Kalender</Link>
        <Link to="/tvattbokning">Boka tvätt</Link>
        <Link to="/inkopslista">Inköpslista</Link>
      </div>
    </Widget>
  )
}
