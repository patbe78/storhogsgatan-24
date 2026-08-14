import { householdId, userId, type CalendarFixtureOptions } from './calendar-fixture'

export const childId = '33333333-3333-4333-8333-333333333333'
export const adultId = '22222222-2222-4222-8222-222222222222'
export const secondChildId = '44444444-4444-4444-8444-444444444444'
export const thirdChildId = '55555555-5555-4555-8555-555555555555'
export const workCategoryId = '10000000-0000-4000-8000-000000000001'
export const householdCategoryId = '10000000-0000-4000-8000-000000000002'
export const otherCategoryId = '10000000-0000-4000-8000-000000000003'

const people = {
  current: { id: userId, name: 'Patrik', color: '#2563eb' },
  child: { id: childId, name: 'Felix', color: '#16a34a' },
  secondChild: { id: secondChildId, name: 'Gustav', color: '#f59e0b' },
  thirdChild: { id: thirdChildId, name: 'Alex', color: '#7c3aed' },
  adult: { id: adultId, name: 'Åsa', color: '#db2777' }
}

function row(
  id: string,
  title: string,
  startsAt: string,
  categoryId: string | null,
  participants = [people.current],
  endsAt?: string
): Record<string, unknown> {
  const categoryName =
    categoryId === workCategoryId
      ? 'Arbete'
      : categoryId === householdCategoryId
        ? 'Hushållssysslor'
        : categoryId === otherCategoryId
          ? 'Skola'
          : null
  return {
    id,
    household_id: householdId,
    title,
    description: '',
    location: null,
    notes: null,
    category_id: categoryId,
    category_name: categoryName,
    category_color: categoryId === workCategoryId ? '#2563eb' : '#f59e0b',
    created_by: userId,
    updated_by: userId,
    starts_at: startsAt,
    ends_at: endsAt ?? new Date(new Date(startsAt).getTime() + 3600000).toISOString(),
    all_day: false,
    all_day_start: null,
    all_day_end: null,
    is_family_event: false,
    reminder_offsets_minutes: [],
    reminder_type: 'none',
    reminder_offset_minutes: null,
    external_source: null,
    external_id: null,
    recurrence_series_id: null,
    participants,
    recurrence: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z'
  }
}

function allDayRow(
  id: string,
  title: string,
  allDayStart: string,
  allDayEnd: string,
  categoryId: string,
  participants: (typeof people.child)[]
): Record<string, unknown> {
  return {
    ...row(id, title, `${allDayStart}T00:00:00.000Z`, categoryId, participants),
    starts_at: null,
    ends_at: null,
    all_day: true,
    all_day_start: allDayStart,
    all_day_end: allDayEnd
  }
}

function recurringOvernightRow(): Record<string, unknown> {
  return {
    ...row(
      'felix-sunday-series',
      'Jobb',
      '2026-08-02T15:30:00.000Z',
      workCategoryId,
      [people.child],
      '2026-08-03T03:30:00.000Z'
    ),
    recurrence_series_id: 'felix-sunday-rule',
    recurrence: {
      id: 'felix-sunday-rule',
      frequency: 'weekly',
      interval_value: 1,
      starts_on: '2026-08-02',
      ends_on: '2026-08-16',
      occurrence_count: null,
      parent_series_id: null,
      split_from_date: null
    }
  }
}

export function dashboardFixtureOptions(): CalendarFixtureOptions {
  return {
    role: 'admin',
    dashboardProfiles: [
      { ...people.current, role: 'admin', is_active: true },
      { ...people.adult, role: 'adult', is_active: true },
      { ...people.child, role: 'member', is_active: true },
      { ...people.secondChild, role: 'member', is_active: true },
      { ...people.thirdChild, role: 'member', is_active: true }
    ],
    calendarProfiles: [
      people.current,
      people.adult,
      people.child,
      people.secondChild,
      people.thirdChild
    ],
    calendarCategories: [
      {
        id: workCategoryId,
        household_id: householdId,
        name: 'Arbete',
        icon: 'briefcase',
        color: '#2563eb',
        is_archived: false,
        is_system: true
      },
      {
        id: householdCategoryId,
        household_id: householdId,
        name: 'Hushållssysslor',
        icon: null,
        color: '#16a34a',
        is_archived: false,
        is_system: false
      },
      {
        id: otherCategoryId,
        household_id: householdId,
        name: 'Skola',
        icon: null,
        color: '#f59e0b',
        is_archived: false,
        is_system: false
      }
    ],
    calendarDefaultEntries: [
      { participant_profile_id: userId, category_id: workCategoryId },
      { participant_profile_id: childId, category_id: workCategoryId }
    ],
    calendarEvents: [
      row('upcoming-hidden', 'Filterdold aktivitet', '2026-08-11T12:00:00.000Z', otherCategoryId),
      row('upcoming-2', 'Aktivitet två', '2026-08-12T12:00:00.000Z', null),
      row('upcoming-3', 'Aktivitet tre', '2026-08-13T12:00:00.000Z', otherCategoryId),
      row('upcoming-4', 'Aktivitet fyra', '2026-08-14T12:00:00.000Z', otherCategoryId),
      row('upcoming-5', 'Aktivitet fem', '2026-08-15T12:00:00.000Z', otherCategoryId),
      row('upcoming-6', 'Aktivitet sex', '2026-08-16T12:00:00.000Z', otherCategoryId),
      row('upcoming-7', 'Aktivitet sju', '2026-08-17T12:00:00.000Z', otherCategoryId),
      row('my-work', 'Jobb', '2026-08-12T05:00:00.000Z', workCategoryId),
      row('my-work-next', 'Nattjour', '2026-08-18T19:00:00.000Z', workCategoryId),
      recurringOvernightRow(),
      row(
        'felix-real-v34',
        'Felix riktigt V34-pass',
        '2026-08-18T06:00:00.000Z',
        workCategoryId,
        [people.child],
        '2026-08-18T14:00:00.000Z'
      ),
      ...[10, 11, 12, 13, 14].flatMap((day) => [
        row(`felix-work-${day}`, 'Jobb', `2026-08-${day}T03:30:00.000Z`, workCategoryId, [
          people.child
        ]),
        row(`gustav-work-${day}`, 'Jobb', `2026-08-${day}T04:00:00.000Z`, workCategoryId, [
          people.secondChild
        ])
      ]),
      allDayRow('alex-leave', 'Sjukskriven', '2026-08-10', '2026-08-14', workCategoryId, [
        people.thirdChild
      ]),
      row('adult-work', 'Jobb', '2026-08-13T07:00:00.000Z', workCategoryId, [people.adult]),
      row(
        'adult-night',
        'Jobb',
        '2026-08-14T19:30:00.000Z',
        workCategoryId,
        [people.adult],
        '2026-08-15T03:30:00.000Z'
      ),
      row(
        'household-now',
        'Sophämtning tunna 1',
        '2026-08-13T04:00:00.000Z',
        householdCategoryId,
        [people.current],
        '2026-08-13T15:00:00.000Z'
      ),
      row('household-next', 'Tvätta bilen', '2026-08-19T16:00:00.000Z', householdCategoryId)
    ]
  }
}
