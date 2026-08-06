import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  acceptInvitation,
  previewInvitation,
  signInInvitedUser
} from '../services/invitation.service'
import type { InvitationPreview } from '../types/invitation'
import { INVALID_INVITATION_MESSAGE } from '../utils/invitation-errors'

export function useInvitationAcceptance(token: string) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)

  const load = useCallback(async () => {
    if (!token) {
      setMessage(INVALID_INVITATION_MESSAGE)
      setLoading(false)
      return
    }
    try {
      setPreview(await previewInvitation(token))
    } catch {
      setMessage(INVALID_INVITATION_MESSAGE)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timeout)
  }, [load])

  async function accept(password?: string) {
    setSubmitting(true)
    setMessage('')
    try {
      const response = await acceptInvitation(token, password)
      if (!response.ok) {
        setMessage(response.message ?? INVALID_INVITATION_MESSAGE)
        return
      }
      setComplete(true)
      if (response.loginRequired) {
        setMessage('Medlemskapet är klart. Logga in för att fortsätta.')
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      setMessage(INVALID_INVITATION_MESSAGE)
    } finally {
      setSubmitting(false)
    }
  }

  async function signInAndAccept(password: string) {
    if (!preview) return
    setSubmitting(true)
    setMessage('')
    try {
      await signInInvitedUser(preview.email, password)
      const response = await acceptInvitation(token)
      if (!response.ok) {
        setMessage(response.message ?? INVALID_INVITATION_MESSAGE)
        return
      }
      navigate('/', { replace: true })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : INVALID_INVITATION_MESSAGE)
    } finally {
      setSubmitting(false)
    }
  }

  return { preview, loading, submitting, message, complete, accept, signInAndAccept }
}
