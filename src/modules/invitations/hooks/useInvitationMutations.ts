import { useState } from 'react'
import { createInvitation } from '../services/invitation.service'
import type { InvitationInput } from '../types/invitation'
import { invitationErrorMessage } from '../utils/invitation-errors'

export function useInvitationMutations(onCreated: () => Promise<void>) {
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(input: InvitationInput) {
    if (submitting) return false
    setSubmitting(true)
    setMessage('')
    try {
      await createInvitation(input)
      await onCreated()
      setMessage('Inbjudan har skickats.')
      return true
    } catch (error) {
      setMessage(invitationErrorMessage(error))
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return { submit, submitting, message }
}
