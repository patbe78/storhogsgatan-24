import { useState, type FormEvent } from 'react'
import { invitationSchema } from '../utils/invitation-validation'
import { useInvitationMutations } from '../hooks/useInvitationMutations'

export function InvitationForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const { submit, submitting, message } = useInvitationMutations(onCreated)
  const [validationMessage, setValidationMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationMessage('')
    const form = event.currentTarget
    const data = new FormData(form)
    const parsed = invitationSchema.safeParse({
      name: data.get('name'),
      email: data.get('email'),
      role: data.get('role'),
      profileColor: data.get('profileColor')
    })
    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? 'Kontrollera formuläret.')
      return
    }
    if (await submit(parsed.data)) form.reset()
  }

  return (
    <form className="family-form" onSubmit={(event) => void handleSubmit(event)}>
      <h3>Bjud in familjemedlem</h3>
      <div className="family-form-grid">
        <label>
          Namn
          <input name="name" required maxLength={100} disabled={submitting} />
        </label>
        <label>
          E-post
          <input name="email" type="email" required autoComplete="email" disabled={submitting} />
        </label>
        <label>
          Roll
          <select name="role" defaultValue="member" required disabled={submitting}>
            <option value="member">Medlem</option>
            <option value="adult">Vuxen</option>
          </select>
        </label>
        <label>
          Profilfärg
          <input
            name="profileColor"
            type="color"
            defaultValue="#2563EB"
            required
            disabled={submitting}
          />
        </label>
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Skickar…' : 'Skicka inbjudan'}
      </button>
      {(validationMessage || message) && (
        <p role="status" className="family-message">
          {validationMessage || message}
        </p>
      )}
    </form>
  )
}
