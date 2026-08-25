import migration from '../../../../supabase/migrations/20260823090000_add_recurrence_weekdays.sql?raw'

describe('recurrence weekdays migration', () => {
  it('adds a nullable constrained ISO-weekday array without rewriting existing rows', () => {
    expect(migration).toContain('add column weekdays smallint[] null')
    expect(migration).toContain("weekdays is null or frequency = 'weekly'")
    expect(migration).not.toMatch(/update\s+public\.calendar_recurrence_series\s+set\s+weekdays/i)
  })

  it('carries weekdays through save and read RPCs', () => {
    expect(migration).toContain("'weekdays', r.weekdays")
    expect(migration).toContain('v_weekdays := public.calendar_parse_recurrence_weekdays')
    expect(migration).toMatch(/occurrence_count, weekdays, created_by/i)
    expect(migration).toContain('weekdays = v_weekdays')
  })

  it('uses the shared SQL expansion in validation, split and reminder delivery', () => {
    const sharedCalls = migration.match(/public\.calendar_recurrence_date\(/g) ?? []
    expect(sharedCalls.length).toBeGreaterThanOrEqual(4)
    expect(migration).toContain('v_old_series.weekdays')
    expect(migration).toContain('r.weekdays')
    expect(migration).toContain('v.weekdays')
  })
})
