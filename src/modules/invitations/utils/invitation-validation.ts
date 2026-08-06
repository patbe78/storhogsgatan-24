import { z } from 'zod'

export const invitationSchema = z.object({
  name: z.string().trim().min(1, 'Namn krävs.').max(100),
  email: z.string().trim().toLowerCase().email('Ange en giltig e-postadress.').max(320),
  role: z.enum(['adult', 'member']),
  profileColor: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^#[0-9A-F]{6}$/, 'Ange en giltig profilfärg.')
})

export function tokenFromLocation(search: string, hash: string): string {
  const queryToken = new URLSearchParams(search).get('token')
  if (queryToken) return queryToken
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(normalizedHash).get('token') ?? ''
}
