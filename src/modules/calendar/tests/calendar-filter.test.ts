import { createCalendarViewModel } from '../adapters/calendar-view.adapter'
import type { CalendarCategory } from '../types/calendar-category'
import type {
  CalendarDefaultFilter,
  CalendarFilterCell,
  CalendarFilterMatrixValue
} from '../types/calendar-filter'
import type { CalendarView } from '../types/calendar-view'
import {
  calendarFilterCellKey,
  createCalendarFilterFromDefault,
  createShowAllCalendarFilter,
  eventMatchesCalendarFilter,
  selectedCalendarFilterCellKeys
} from '../utils/calendar-filter'
import { singleOccurrence } from '../utils/calendar-recurrence'
import { event, felix, householdId, patrik } from './fixtures'

const work: CalendarCategory = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  householdId,
  name: 'Arbete',
  icon: null,
  color: null,
  isArchived: false
}
const school: CalendarCategory = {
  ...work,
  id: 'bbbbbbbb-2222-4222-8222-222222222222',
  name: 'Skola'
}
const profiles = [
  { id: patrik.id, name: patrik.name, color: patrik.color },
  { id: felix.id, name: felix.name, color: felix.color }
]
const realCell = (participantProfileId: string, categoryId = work.id): CalendarFilterCell => ({
  participantProfileId,
  category: { kind: 'category', categoryId }
})
const noCategoryCell = (participantProfileId: string): CalendarFilterCell => ({
  participantProfileId,
  category: { kind: 'uncategorized' }
})
const matrix = (...selectedCells: CalendarFilterCell[]): CalendarFilterMatrixValue => ({
  selectedCells
})
const matches = (value: CalendarFilterMatrixValue, candidate = event()) =>
  eventMatchesCalendarFilter(candidate, selectedCalendarFilterCellKeys(value))

describe('kalenderns filtermatris', () => {
  it('matchar en vald riktig kategoricell och döljer en avmarkerad cell', () => {
    const candidate = event({ categoryId: work.id })
    expect(matches(matrix(realCell(felix.id)), candidate)).toBe(true)
    expect(matches(matrix(realCell(patrik.id)), candidate)).toBe(false)
  })

  it('använder OR-semantik mellan flera deltagare', () => {
    const candidate = event({
      categoryId: work.id,
      participants: profiles
    })
    expect(matches(matrix(realCell(patrik.id)), candidate)).toBe(true)
    expect(matches(matrix(realCell(felix.id)), candidate)).toBe(true)
    expect(matches(matrix(realCell(felix.id, school.id)), candidate)).toBe(false)
  })

  it('filtrerar Ingen kategori separat per person med samma OR-semantik', () => {
    const single = event({ categoryId: null, participants: [profiles[1]] })
    expect(matches(matrix(noCategoryCell(felix.id)), single)).toBe(true)
    expect(matches(matrix(noCategoryCell(patrik.id)), single)).toBe(false)

    const multiple = event({ categoryId: null, participants: profiles })
    expect(matches(matrix(noCategoryCell(patrik.id)), multiple)).toBe(true)
  })

  it('skiljer visa allt, avmarkera allt och flera valda celler', () => {
    const showAll = createShowAllCalendarFilter(profiles, [work, school])
    expect(matches(showAll, event({ categoryId: work.id, participants: [profiles[0]] }))).toBe(true)
    expect(matches(showAll, event({ categoryId: null, participants: [profiles[1]] }))).toBe(true)
    expect(matches(matrix(), event({ categoryId: work.id, participants: profiles }))).toBe(false)
    expect(matches(matrix(realCell(patrik.id), noCategoryCell(felix.id)))).toBe(true)
  })

  it('skiljer inget sparat default från ett sparat tomt default', () => {
    const noDefault: CalendarDefaultFilter = { hasCustomDefault: false, selectedCells: [] }
    const emptyCustom: CalendarDefaultFilter = { hasCustomDefault: true, selectedCells: [] }
    expect(createCalendarFilterFromDefault(noDefault, profiles, [work]).selectedCells).toHaveLength(
      4
    )
    expect(
      createCalendarFilterFromDefault(emptyCustom, profiles, [work]).selectedCells
    ).toHaveLength(0)
  })

  it('lämnar nya personer och kategorier av för custom-default men på för system-default', () => {
    const saved: CalendarDefaultFilter = {
      hasCustomDefault: true,
      selectedCells: [realCell(patrik.id)]
    }
    const gustav = { id: '33333333-3333-4333-8333-333333333333', name: 'Gustav', color: null }
    const custom = createCalendarFilterFromDefault(saved, [...profiles, gustav], [work, school])
    const keys = selectedCalendarFilterCellKeys(custom)
    expect(keys.has(calendarFilterCellKey(realCell(patrik.id)))).toBe(true)
    expect(keys.has(calendarFilterCellKey(realCell(patrik.id, school.id)))).toBe(false)
    expect(keys.has(calendarFilterCellKey(noCategoryCell(gustav.id)))).toBe(false)

    const system = createCalendarFilterFromDefault(
      { hasCustomDefault: false, selectedCells: [] },
      [...profiles, gustav],
      [work, school]
    )
    expect(system.selectedCells).toHaveLength(9)
  })

  it('använder ID och påverkas inte av namnbyte eller avaktiverade rader/kolumner', () => {
    const saved: CalendarDefaultFilter = {
      hasCustomDefault: true,
      selectedCells: [realCell(patrik.id), noCategoryCell(felix.id)]
    }
    const renamedProfiles = [{ ...profiles[0], name: 'Nytt namn' }]
    const renamedCategories = [
      { ...work, name: 'Nytt kategorinamn' },
      { ...school, isArchived: true }
    ]
    const result = createCalendarFilterFromDefault(saved, renamedProfiles, renamedCategories)
    expect(result.selectedCells).toEqual([realCell(patrik.id)])
  })

  it('döljer ogiltiga legacy-event utan deltagare eftersom ingen matriscell kan matcha', () => {
    expect(
      matches(createShowAllCalendarFilter(profiles, [work]), event({ participants: [] }))
    ).toBe(false)
  })

  it.each<CalendarView>(['month', 'week', 'day', 'agenda'])(
    'ger samma filtrerade event-set till vyn %s',
    (view) => {
      const visible = event({ id: 'visible', categoryId: null, participants: [profiles[0]] })
      const hidden = event({ id: 'hidden', categoryId: work.id, participants: [profiles[1]] })
      const selected = selectedCalendarFilterCellKeys(matrix(noCategoryCell(patrik.id)))
      const occurrences = [visible, hidden]
        .filter((candidate) => eventMatchesCalendarFilter(candidate, selected))
        .map(singleOccurrence)
      const model = createCalendarViewModel(view, new Date(2026, 7, 10), occurrences)
      expect(model.items.map((item) => item.eventId)).toEqual(['visible'])
    }
  )
})
