import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Download, PlusCircle, X } from 'lucide-react'
import { isOnboardingComplete, setOnboardingComplete } from '../services/pwa-storage'

const steps = [
  {
    title: 'Se familjens kalender',
    description: 'Få en tydlig överblick över familjens aktiviteter.',
    icon: CalendarDays
  },
  {
    title: 'Skapa aktiviteter',
    description: 'Lägg till det som händer och välj deltagare.',
    icon: PlusCircle
  },
  {
    title: 'Installera appen',
    description: 'Lägg Storhogsgatan 24 på hemskärmen för snabb åtkomst.',
    icon: Download
  }
]

export function OnboardingDialog() {
  const [open, setOpen] = useState(() => !isOnboardingComplete())
  const [step, setStep] = useState(0)
  const closeButton = useRef<HTMLButtonElement>(null)
  const current = steps[step]
  const Icon = current.icon

  useEffect(() => {
    if (open) closeButton.current?.focus()
  }, [open])

  if (!open) return null

  function complete() {
    setOnboardingComplete()
    setOpen(false)
  }

  return (
    <div className="pwa-dialog-backdrop onboarding-backdrop" role="presentation">
      <section
        className="pwa-dialog onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <button
          ref={closeButton}
          type="button"
          className="icon-button onboarding-close"
          aria-label="Hoppa över introduktionen"
          onClick={complete}
        >
          <X aria-hidden="true" />
        </button>
        <Icon className="onboarding-icon" size={36} aria-hidden="true" />
        <p className="onboarding-progress">
          Steg {step + 1} av {steps.length}
        </p>
        <h2 id="onboarding-title">{current.title}</h2>
        <p>{current.description}</p>
        <div className="onboarding-dots" aria-hidden="true">
          {steps.map((item, index) => (
            <span key={item.title} className={index === step ? 'active' : ''} />
          ))}
        </div>
        <div className="pwa-dialog-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (step === steps.length - 1) complete()
              else setStep((value) => value + 1)
            }}
          >
            {step === steps.length - 1 ? 'Klar' : 'Fortsätt'}
          </button>
          <button type="button" className="text-button" onClick={complete}>
            Hoppa över
          </button>
        </div>
      </section>
    </div>
  )
}
