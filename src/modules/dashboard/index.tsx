import {
  DateWidget,
  EventsWidget,
  FamilyWidget,
  ShortcutsWidget,
  WeekWidget
} from './components/widgets'
import { useCurrentProfile } from './hooks/use-current-profile'

export function DashboardPage() {
  const profile = useCurrentProfile()

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Översikt</p>
        <h1>{profile?.name ? `Välkommen ${profile.name}` : 'Välkommen'}</h1>
        <p>Här samlas familjens vardag.</p>
      </div>
      <div className="widget-grid">
        <DateWidget />
        <WeekWidget />
        <FamilyWidget />
        <EventsWidget />
        <ShortcutsWidget />
      </div>
    </>
  )
}
