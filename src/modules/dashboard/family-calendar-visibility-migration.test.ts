import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260813190000_fix_family_calendar_visibility.sql'),
  'utf8'
)

describe('family calendar visibility migration', () => {
  it('scopear read-RPC:erna till aktiv kalenderroll och current household', () => {
    expect(migration).toContain('security definer')
    expect(migration).toContain("public.current_calendar_role()) in ('admin', 'adult', 'member')")
    expect(migration).toContain('e.household_id = (select public.current_household_id())')
    expect(migration).toContain('where p.id = auth.uid() and p.is_active')
    expect(migration).toContain('where p.household_id = v_household')
  })

  it('exponerar smala RPC:er utan bred profilpolicy eller write-ändring', () => {
    expect(migration).toContain('public.dashboard_list_active_profiles()')
    expect(migration).toContain(
      'returns table (id uuid, name text, role text, color text, is_active boolean)'
    )
    expect(migration).not.toMatch(/create policy/i)
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/i)
    expect(migration).not.toContain('calendar_save_event')
    expect(migration).not.toContain('calendar_delete_event')
  })
})
