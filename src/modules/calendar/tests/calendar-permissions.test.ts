import {
  getCalendarPermissions,
  validateParticipantPermission
} from '../utils/calendar-permissions'
import { event, felix, patrik } from './fixtures'

describe('calendar permissions', () => {
  it('låter admin ändra allt', () =>
    expect(getCalendarPermissions(patrik).canEdit(event({ createdBy: felix.id }))).toBe(true))
  it('låter member bara ändra eget', () => {
    const permissions = getCalendarPermissions(felix)
    expect(permissions.canEdit(event())).toBe(false)
    expect(permissions.canEdit(event({ createdBy: felix.id }))).toBe(true)
  })
  it('nekar guest och profil utan hushåll', () => {
    expect(getCalendarPermissions({ ...felix, role: 'guest' }).canAccess).toBe(false)
    expect(getCalendarPermissions({ ...felix, household_id: null }).canAccess).toBe(false)
  })
  it('kräver member själv och nekar familjeaktivitet', () => {
    expect(validateParticipantPermission(felix, [patrik.id], false)).toContain('själv')
    expect(validateParticipantPermission(felix, [felix.id], true)).toContain('Hela familjen')
  })
})
