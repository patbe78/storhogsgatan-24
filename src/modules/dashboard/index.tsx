import {
  DateWidget,
  EventsWidget,
  FamilyWidget,
  ShortcutsWidget,
  WeekWidget
} from './components/widgets'
export function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Översikt</p>
        <h1>Välkommen hem</h1>
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
