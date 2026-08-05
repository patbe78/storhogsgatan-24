import { PwaStatusPanel } from '@/modules/pwa'

export function SettingsPage() {
  return (
    <div className="settings-page">
      <header className="page-heading">
        <p className="eyebrow">Inställningar</p>
        <h1>Inställningar</h1>
        <p>Anpassa hur Storhogsgatan 24 fungerar på den här enheten.</p>
      </header>
      <PwaStatusPanel />
    </div>
  )
}
