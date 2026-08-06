export const INVALID_INVITATION_MESSAGE = 'Inbjudan är inte giltig eller kan inte längre användas.'

export function invitationErrorMessage(error: unknown, fallback = 'Inbjudan kunde inte skickas.') {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message)
    if (
      message === 'Den här e-postadressen är redan medlem i hushållet.' ||
      message === 'Det finns redan en aktiv inbjudan till denna e-postadress.' ||
      message === 'Du har inte behörighet att utföra denna åtgärd.' ||
      message === 'Kontrollera formuläret och försök igen.'
    ) {
      return message
    }
  }
  return fallback
}
