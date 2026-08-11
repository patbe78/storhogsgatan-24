import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth'
import { CalendarFilterMatrix } from './CalendarFilterMatrix'
import { useCalendarCategories } from '../hooks/useCalendarCategories'
import {
  calendarDefaultFilterQueryKey,
  useCalendarDefaultFilter
} from '../hooks/useCalendarDefaultFilter'
import { useCalendarProfiles } from '../hooks/useCalendarProfiles'
import { saveCalendarDefaultFilter } from '../services/calendar-default-filter.service'
import type { CalendarCategory } from '../types/calendar-category'
import type { CalendarEventParticipant } from '../types/calendar-event'
import type { CalendarDefaultFilter } from '../types/calendar-filter'
import {
  createCalendarFilterFromDefault,
  createShowAllCalendarFilter
} from '../utils/calendar-filter'

function CalendarDefaultFilterEditor({
  members,
  categories,
  savedDefault
}: {
  members: CalendarEventParticipant[]
  categories: CalendarCategory[]
  savedDefault: CalendarDefaultFilter
}) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const [draft, setDraft] = useState(() =>
    createCalendarFilterFromDefault(savedDefault, members, categories)
  )
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null)
  const save = useMutation({
    mutationFn: saveCalendarDefaultFilter,
    onSuccess: (_, value) => {
      queryClient.setQueryData(calendarDefaultFilterQueryKey(session?.user.id), {
        hasCustomDefault: true,
        selectedCells: value.selectedCells
      })
      setFeedback('saved')
    },
    onError: () => setFeedback('error')
  })

  return (
    <>
      <CalendarFilterMatrix
        members={members}
        categories={categories}
        value={draft}
        onChange={(value) => {
          setFeedback(null)
          setDraft(value)
        }}
        disabled={save.isPending}
      />
      <div className="calendar-default-filter-settings__actions">
        <button
          type="button"
          className="primary-button"
          disabled={save.isPending}
          onClick={() => {
            setFeedback(null)
            save.mutate(draft)
          }}
        >
          {save.isPending ? 'Sparar…' : 'Spara standardfilter'}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={save.isPending}
          onClick={() => {
            setFeedback(null)
            setDraft(createShowAllCalendarFilter(members, categories))
          }}
        >
          Återställ till visa allt
        </button>
      </div>
      {feedback === 'saved' && (
        <p className="calendar-default-filter-settings__success" role="status">
          Standardfiltret har sparats.
        </p>
      )}
      {feedback === 'error' && (
        <p className="calendar-default-filter-settings__error" role="alert">
          Det gick inte att spara standardfiltret. Ditt tidigare sparade filter är oförändrat.
        </p>
      )}
    </>
  )
}

export function CalendarDefaultFilterSettings() {
  const profiles = useCalendarProfiles()
  const categories = useCalendarCategories(true)
  const savedDefault = useCalendarDefaultFilter()
  const loading =
    profiles.isLoading ||
    categories.isLoading ||
    savedDefault.isLoading ||
    !savedDefault.isFetchedAfterMount
  const failed = profiles.isError || categories.isError || savedDefault.isError

  return (
    <section
      className="settings-card calendar-default-filter-settings"
      aria-labelledby="default-filter-heading"
    >
      <p className="eyebrow">Kalender</p>
      <h2 id="default-filter-heading">Standardfilter</h2>
      <p>
        Ditt standardfilter används varje gång du öppnar kalendern. Tillfälliga ändringar i
        kalenderns filter påverkar inte standardinställningen.
      </p>
      {loading && <p role="status">Laddar standardfilter…</p>}
      {failed && (
        <p className="calendar-default-filter-settings__error" role="alert">
          Det gick inte att ladda standardfiltret.
        </p>
      )}
      {savedDefault.isFetchedAfterMount &&
        savedDefault.data &&
        profiles.data &&
        categories.data && (
          <CalendarDefaultFilterEditor
            members={profiles.data}
            categories={categories.data}
            savedDefault={savedDefault.data}
          />
        )}
    </section>
  )
}
