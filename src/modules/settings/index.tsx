import { PwaStatusPanel } from '@/modules/pwa'
import { FamilyAdministration } from '@/modules/family'
import { PushNotificationPanel } from '@/modules/notifications'
import { CalendarDefaultFilterSettings } from '@/modules/calendar/components/CalendarDefaultFilterSettings'

export function SettingsPage() {
  return (
    <div className="settings-page">
      <header className="page-heading">
        <p className="eyebrow">Inställningar</p>
        <h1>Inställningar</h1>
        <p>Anpassa hur Storhogsgatan 24 fungerar på den här enheten.</p>
      </header>
      <CalendarDefaultFilterSettings />
      <FamilyAdministration />
      <PwaStatusPanel />
      <PushNotificationPanel />
    </div>
  )
}
