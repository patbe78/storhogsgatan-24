import type { CalendarCategory } from '@/modules/calendar/types/calendar-category'
import type {
  CalendarEventParticipant,
  CalendarOccurrence
} from '@/modules/calendar/types/calendar-event'
import type { CalendarRecurrenceRule } from '@/modules/calendar/types/calendar-recurrence'
import { generateOccurrences, singleOccurrence } from '@/modules/calendar/utils/calendar-recurrence'
import { event, householdId } from '@/modules/calendar/tests/fixtures'
import {
  selectFamilyWorkActivities,
  selectHouseholdActivities,
  selectMyWorkActivities,
  selectUpcomingPersonalActivities
} from './selectors/dashboard-selectors'
import type { DashboardProfile } from './types/dashboard'
import { DASHBOARD_CATEGORY_NAMES, dashboardCategoryIdentity } from './utils/dashboard-categories'
import { dashboardTodayRange, dashboardWeekRange } from './utils/dashboard-dates'

const now = new Date('2026-08-11T10:00:00.000Z')
const workCategoryId = '10000000-0000-4000-8000-000000000001'
const householdCategoryId = '10000000-0000-4000-8000-000000000002'
const otherCategoryId = '10000000-0000-4000-8000-000000000003'
const current: DashboardProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Patrik',
  role: 'admin',
  color: '#2563eb',
  is_active: true
}
const adult: DashboardProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Anna',
  role: 'adult',
  color: '#db2777',
  is_active: true
}
const child: DashboardProfile = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Felix',
  role: 'member',
  color: '#16a34a',
  is_active: true
}
const otherChild: DashboardProfile = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Maja',
  role: 'member',
  color: '#f59e0b',
  is_active: true
}
const inactiveChild: DashboardProfile = {
  ...otherChild,
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Inaktiv',
  is_active: false
}
const categories: CalendarCategory[] = [
  {
    id: workCategoryId,
    householdId,
    name: 'Arbete',
    icon: 'briefcase',
    color: '#2563eb',
    isArchived: false,
    isSystem: true
  },
  {
    id: householdCategoryId,
    householdId,
    name: 'Hushållsarbete',
    icon: null,
    color: '#16a34a',
    isArchived: false,
    isSystem: false
  },
  {
    id: otherCategoryId,
    householdId,
    name: 'Skola',
    icon: null,
    color: '#f59e0b',
    isArchived: false,
    isSystem: false
  }
]
const work = dashboardCategoryIdentity(categories, DASHBOARD_CATEGORY_NAMES.work)
const household = dashboardCategoryIdentity(categories, DASHBOARD_CATEGORY_NAMES.household)

function participant(profile: DashboardProfile): CalendarEventParticipant {
  return { id: profile.id, name: profile.name, color: profile.color }
}

function timed(
  title: string,
  startsAt: string,
  categoryId: string | null = otherCategoryId,
  participants: DashboardProfile[] = [current],
  endsAt = new Date(new Date(startsAt).getTime() + 3600000).toISOString()
): CalendarOccurrence {
  return singleOccurrence(
    event({
      id: title,
      title,
      startsAt,
      endsAt,
      categoryId,
      categoryName:
        categoryId === workCategoryId
          ? 'Arbete'
          : categoryId === householdCategoryId
            ? 'Hushållsarbete'
            : categoryId === otherCategoryId
              ? 'Skola'
              : null,
      participants: participants.map(participant)
    })
  )
}

describe('dashboard selectors', () => {
  it('väljer endast den inloggade profilen och fasta kommande-kategorier', () => {
    const occurrences = [
      timed('annan profil', '2026-08-11T08:00:00.000Z', otherCategoryId, [child]),
      timed('arbete', '2026-08-11T09:00:00.000Z', workCategoryId),
      timed('hushåll', '2026-08-11T10:00:00.000Z', householdCategoryId),
      timed('utan kategori', '2026-08-11T11:00:00.000Z', null),
      timed('flera deltagare', '2026-08-11T12:00:00.000Z', otherCategoryId, [child, current])
    ]

    expect(
      selectUpcomingPersonalActivities(
        occurrences,
        current,
        dashboardTodayRange(now),
        work,
        household
      ).map((item) => item.occurrence.event.title)
    ).toEqual(['utan kategori', 'flera deltagare'])
  })

  it('identifierar systemkategori med ID även om eventnamnet avviker', () => {
    const occurrence = timed('stabilt arbete', '2026-08-11T08:00:00.000Z', workCategoryId)
    occurrence.event.categoryName = 'Äldre visningsnamn'
    expect(
      selectMyWorkActivities([occurrence], current, work, dashboardWeekRange(now, 0)).map(
        (item) => item.occurrence.event.title
      )
    ).toEqual(['stabilt arbete'])
  })

  it('inkluderar idag och idag + 14 men exkluderar + 15 och avslutade event', () => {
    const occurrences = [
      timed('gammal', '2026-08-10T19:00:00.000Z'),
      timed('idag', '2026-08-11T08:00:00.000Z'),
      timed('plus fjorton', '2026-08-25T08:00:00.000Z'),
      timed('plus femton', '2026-08-26T08:00:00.000Z')
    ]

    expect(
      selectUpcomingPersonalActivities(
        occurrences,
        current,
        dashboardTodayRange(now),
        work,
        household
      ).map((item) => item.occurrence.event.title)
    ).toEqual(['idag', 'plus fjorton'])
  })

  it('sorterar deterministiskt och begränsar 7+ träffar till de 6 närmaste', () => {
    const occurrences = Array.from({ length: 7 }, (_, index) =>
      timed(
        `aktivitet ${index + 1}`,
        `2026-08-${String(17 - index).padStart(2, '0')}T08:00:00.000Z`
      )
    )
    const selected = selectUpcomingPersonalActivities(
      occurrences,
      current,
      dashboardTodayRange(now),
      work,
      household
    )
    expect(selected).toHaveLength(6)
    expect(selected.map((item) => item.occurrence.event.title)).toEqual([
      'aktivitet 7',
      'aktivitet 6',
      'aktivitet 5',
      'aktivitet 4',
      'aktivitet 3',
      'aktivitet 2'
    ])
  })

  it('använder kalenderns recurrence-expansion och tar bara periodens occurrences', () => {
    const recurringEvent = event({
      id: 'recurring',
      title: 'Återkommande träning',
      startsAt: '2026-08-04T08:00:00.000Z',
      endsAt: '2026-08-04T09:00:00.000Z',
      categoryId: otherCategoryId,
      categoryName: 'Skola',
      participants: [participant(current)]
    })
    const rule: CalendarRecurrenceRule = {
      id: 'series',
      frequency: 'weekly',
      intervalValue: 1,
      startsOn: '2026-08-04',
      endsOn: null,
      occurrenceCount: 5,
      parentSeriesId: null,
      splitFromDate: null
    }
    const expanded = generateOccurrences(
      recurringEvent,
      rule,
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-09-01T00:00:00.000Z')
    )

    expect(
      selectUpcomingPersonalActivities(
        expanded,
        current,
        dashboardTodayRange(now),
        work,
        household
      ).map((item) => item.occurrence.occurrenceDate)
    ).toEqual(['2026-08-11', '2026-08-18', '2026-08-25'])
  })

  it('inkluderar heldag och flerdagars-event som överlappar perioden', () => {
    const allDay = singleOccurrence(
      event({
        id: 'heldag',
        title: 'Heldag',
        allDay: true,
        startsAt: null,
        endsAt: null,
        allDayStart: '2026-08-11',
        allDayEnd: '2026-08-11',
        categoryId: null,
        categoryName: null,
        participants: [participant(current)]
      })
    )
    const multiDay = timed(
      'Flerdagars',
      '2026-08-09T08:00:00.000Z',
      null,
      [current],
      '2026-08-12T08:00:00.000Z'
    )
    expect(
      selectUpcomingPersonalActivities(
        [allDay, multiDay],
        current,
        dashboardTodayRange(now),
        work,
        household
      ).map((item) => item.occurrence.event.title)
    ).toEqual(['Flerdagars', 'Heldag'])
  })

  it('väljer mina arbetstider och hushållsuppgifter per ISO-vecka', () => {
    const occurrences = [
      timed('jobb nu', '2026-08-12T05:00:00.000Z', workCategoryId),
      timed('jobb nästa', '2026-08-18T05:00:00.000Z', workCategoryId),
      timed('städa nu', '2026-08-13T16:00:00.000Z', householdCategoryId),
      timed('annans jobb', '2026-08-12T06:00:00.000Z', workCategoryId, [child])
    ]

    expect(
      selectMyWorkActivities(occurrences, current, work, dashboardWeekRange(now, 0)).map(
        (item) => item.occurrence.event.title
      )
    ).toEqual(['jobb nu'])
    expect(
      selectMyWorkActivities(occurrences, current, work, dashboardWeekRange(now, 1)).map(
        (item) => item.occurrence.event.title
      )
    ).toEqual(['jobb nästa'])
    expect(
      selectHouseholdActivities(occurrences, current, household, dashboardWeekRange(now, 0)).map(
        (item) => item.occurrence.event.title
      )
    ).toEqual(['städa nu'])
  })

  it('visar barnens arbete för admin/vuxen utan duplicering av delade event', () => {
    const occurrences = [
      timed('eget', '2026-08-12T05:00:00.000Z', workCategoryId, [current]),
      timed('annan vuxen', '2026-08-12T06:00:00.000Z', workCategoryId, [adult]),
      timed('delat barnpass', '2026-08-12T07:00:00.000Z', workCategoryId, [child, otherChild]),
      timed('inaktivt barn', '2026-08-12T08:00:00.000Z', workCategoryId, [inactiveChild])
    ]
    const selected = selectFamilyWorkActivities(
      occurrences,
      current,
      [current, adult, child, otherChild, inactiveChild],
      work,
      dashboardWeekRange(now, 0)
    )
    expect(selected).toHaveLength(1)
    expect(selected[0].owners.map((owner) => owner.name)).toEqual(['Felix', 'Maja'])
  })

  it('visar admin/vuxna för barn men aldrig barnets egna arbete', () => {
    const occurrences = [
      timed('barnets eget', '2026-08-12T05:00:00.000Z', workCategoryId, [child]),
      timed('vuxenpass', '2026-08-12T06:00:00.000Z', workCategoryId, [current, adult]),
      timed('annat barn', '2026-08-12T07:00:00.000Z', workCategoryId, [otherChild])
    ]
    const family = selectFamilyWorkActivities(
      occurrences,
      child,
      [current, adult, child, otherChild],
      work,
      dashboardWeekRange(now, 0)
    )
    expect(family.map((item) => item.occurrence.event.title)).toEqual(['vuxenpass'])
    expect(family[0].owners.map((owner) => owner.name)).toEqual(['Patrik', 'Anna'])
    expect(
      selectMyWorkActivities(occurrences, child, work, dashboardWeekRange(now, 0)).map(
        (item) => item.occurrence.event.title
      )
    ).toEqual(['barnets eget'])
  })
})
