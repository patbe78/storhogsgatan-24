import { DateWidget, EventsWidget, WeeklyActivitiesWidget } from './components/widgets'
import { useCurrentProfile } from './hooks/use-current-profile'
import { useDashboardViewModel } from './hooks/use-dashboard-view-model'
import { isAdultLikeProfile } from './utils/dashboard-roles'

export function DashboardPage() {
  const profile = useCurrentProfile()
  const dashboard = useDashboardViewModel(profile)
  const showAdultWork = profile ? isAdultLikeProfile(profile) : false

  return (
    <>
      <div className="page-heading dashboard-heading">
        <p className="eyebrow">Översikt</p>
        <h1>{profile?.name ? `Välkommen ${profile.name}` : 'Välkommen'}</h1>
        <p>Här samlas familjens vardag.</p>
      </div>
      <div className="widget-grid dashboard-grid">
        <DateWidget label={dashboard.date.label} weekNumber={dashboard.date.weekNumber} />
        <EventsWidget
          items={dashboard.upcoming}
          isLoading={dashboard.isLoading}
          isError={dashboard.isError}
        />
        <WeeklyActivitiesWidget
          cardName={showAdultWork ? 'Våra arbetstider' : 'Mina arbetstider'}
          {...dashboard.myWork}
          empty="Inga arbetstider denna vecka."
          showOwners={showAdultWork}
          activityType="work"
          isLoading={dashboard.isLoading}
          isError={dashboard.isError}
        />
        <WeeklyActivitiesWidget
          cardName="Familjens arbetstider"
          {...dashboard.familyWork}
          empty="Inga arbetstider denna vecka."
          showOwners
          activityType="work"
          isLoading={dashboard.isLoading}
          isError={dashboard.isError}
        />
        <WeeklyActivitiesWidget
          cardName="Hushållsuppgifter"
          {...dashboard.household}
          empty="Inga hushållsuppgifter denna vecka."
          activityType="household"
          isLoading={dashboard.isLoading}
          isError={dashboard.isError}
        />
      </div>
    </>
  )
}
