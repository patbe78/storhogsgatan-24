interface InvitationEmail {
  apiKey: string
  from: string
  to: string
  invitedName: string
  invitedBy: string
  householdName: string
  roleLabel: string
  expiresAt: string
  invitationUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function sendInvitationEmail(input: InvitationEmail): Promise<boolean> {
  const name = escapeHtml(input.invitedName)
  const inviter = escapeHtml(input.invitedBy)
  const household = escapeHtml(input.householdName)
  const role = escapeHtml(input.roleLabel)
  const expires = new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Stockholm'
  }).format(new Date(input.expiresAt))

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: `Inbjudan till ${input.householdName}`,
        html: `<main style="font-family:system-ui;max-width:560px;margin:auto"><h1>Välkommen till ${household}</h1><p>Hej ${name}!</p><p>${inviter} har bjudit in dig till Storhogsgatan 24 som ${role}.</p><p><a href="${escapeHtml(input.invitationUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:white;text-decoration:none;border-radius:8px">Acceptera inbjudan</a></p><p>Inbjudan gäller till ${escapeHtml(expires)} och kan bara användas en gång.</p></main>`,
        text: `Hej ${input.invitedName}!\n\n${input.invitedBy} har bjudit in dig till Storhogsgatan 24 (${input.householdName}) som ${input.roleLabel}.\n\nAcceptera inbjudan: ${input.invitationUrl}\n\nInbjudan gäller till ${expires} och kan bara användas en gång.`
      })
    })
    return response.ok
  } catch {
    return false
  }
}
