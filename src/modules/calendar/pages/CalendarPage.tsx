import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarOccurrence,
  RecurringActionScope
} from '../types/calendar-event'
import type { CalendarViewItem } from '../types/calendar-view'
import { addDays, calendarRange, parseISO, toDateKey } from '../utils/calendar-dates'
import { friendlyCalendarError } from '../utils/calendar-errors'
import { occurrencesBefore, singleOccurrence } from '../utils/calendar-recurrence'
import { checkCalendarConflicts } from '../services/calendar-conflict.service'
import { useCalendarNavigation } from '../hooks/useCalendarNavigation'
import { useCalendarFilters } from '../hooks/useCalendarFilters'
import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { useCalendarProfiles } from '../hooks/useCalendarProfiles'
import { useCalendarCategories } from '../hooks/useCalendarCategories'
import { useCalendarPermissions } from '../hooks/useCalendarPermissions'
import { useCalendarMutations } from '../hooks/useCalendarMutations'
import { useCalendarViewModel } from '../hooks/useCalendarViewModel'
import { CalendarToolbar } from '../components/CalendarToolbar'
import { CalendarFilters } from '../components/CalendarFilters'
import { CalendarMonthView } from '../components/CalendarMonthView'
import { CalendarWeekView } from '../components/CalendarWeekView'
import { CalendarDayView } from '../components/CalendarDayView'
import { CalendarAgendaView } from '../components/CalendarAgendaView'
import { CalendarSwipeSurface } from '../components/CalendarSwipeSurface'
import { CalendarStatus } from '../components/CalendarStatus'
import { CalendarDialog } from '../components/CalendarDialog'
import { CalendarEventForm } from '../components/CalendarEventForm'
import { CalendarEventDetails } from '../components/CalendarEventDetails'
import { CalendarConflictWarning } from '../components/CalendarConflictWarning'
import { RecurringEventActionDialog } from '../components/RecurringEventActionDialog'
import { CalendarCategoryManager } from '../components/CalendarCategoryManager'
import type { CalendarConflict } from '../utils/calendar-conflict'
import '../calendar.css'

type Mode = 'closed' | 'create' | 'details' | 'edit' | 'categories'

export function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const navigation = useCalendarNavigation(params.get('date'))
  const filterState = useCalendarFilters()
  const permissions = useCalendarPermissions()
  const profiles = useCalendarProfiles()
  const categories = useCalendarCategories(true)
  const range = calendarRange(navigation.view, navigation.anchor)
  const events = useCalendarEvents(
    range.start,
    range.end,
    filterState.filters,
    permissions.profile?.id
  )
  const model = useCalendarViewModel(navigation.view, navigation.anchor, events.data ?? [])
  const mutations = useCalendarMutations()
  const [mode, setMode] = useState<Mode>('closed')
  const [selected, setSelected] = useState<CalendarViewItem | null>(null)
  const [initialDate, setInitialDate] = useState<string>()
  const [pending, setPending] = useState<CalendarEventInput | null>(null)
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([])
  const [seriesAction, setSeriesAction] = useState<'redigera' | 'radera' | null>(null)
  const [editScope, setEditScope] = useState<RecurringActionScope>('series')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const linkedItem = model.items.find((candidate) => candidate.key === params.get('event')) ?? null
  const activeSelected = selected ?? linkedItem
  const activeMode: Mode = mode === 'closed' && linkedItem ? 'details' : mode

  if (permissions.isLoading)
    return (
      <section className="calendar-access" role="status">
        Laddar kalendern…
      </section>
    )

  if (!permissions.canAccess)
    return (
      <section className="calendar-access">
        <h1>Kalender</h1>
        <p>
          {permissions.profile?.role === 'guest'
            ? 'Gäster har inte tillgång till familjekalendern.'
            : 'Din profil saknar en granskad hushållskoppling. Kontakta en administratör.'}
        </p>
      </section>
    )

  function closeDialog() {
    setMode('closed')
    setSelected(null)
    setPending(null)
    setConflicts([])
    setSeriesAction(null)
    setActionError('')
    setParams({})
  }
  function selectItem(item: CalendarViewItem) {
    setSelected(item)
    setMode('details')
    setParams({ event: item.key })
  }
  function createAt(date?: string) {
    setInitialDate(date)
    setSelected(null)
    setMode('create')
  }

  function candidateFor(input: CalendarEventInput): CalendarOccurrence {
    const participants = (profiles.data ?? []).filter((person) =>
      input.participantIds.includes(person.id)
    )
    const event: CalendarEvent = {
      id: input.id ?? 'new',
      householdId: permissions.profile!.household_id!,
      title: input.title,
      description: input.description,
      location: input.location ?? null,
      notes: input.notes ?? null,
      categoryId: input.categoryId ?? null,
      categoryName: null,
      categoryColor: null,
      createdBy: activeSelected?.occurrence.event.createdBy ?? permissions.profile!.id,
      updatedBy: permissions.profile!.id,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      allDay: input.allDay,
      allDayStart: input.allDayStart ?? null,
      allDayEnd: input.allDayEnd ?? null,
      isFamilyEvent: input.isFamilyEvent,
      reminderOffsetsMinutes: input.reminderOffsetsMinutes,
      externalSource: input.externalSource ?? null,
      externalId: input.externalId ?? null,
      recurrenceSeriesId: activeSelected?.occurrence.event.recurrenceSeriesId ?? null,
      participants,
      createdAt: '',
      updatedAt: ''
    }
    return singleOccurrence(event)
  }

  async function submit(input: CalendarEventInput) {
    setActionError('')
    try {
      const found = await checkCalendarConflicts(candidateFor(input))
      if (found.length) {
        setPending(input)
        setConflicts(found)
        return
      }
      await persist(input)
    } catch (error) {
      setActionError(friendlyCalendarError(error))
    }
  }

  async function persist(input: CalendarEventInput) {
    if (editScope === 'future' && activeSelected)
      await mutations.split.mutateAsync({
        id: activeSelected.eventId,
        date: activeSelected.occurrence.occurrenceDate,
        priorOccurrences: priorOccurrenceCount(),
        input
      })
    else await mutations.save.mutateAsync(input)
    closeDialog()
  }

  async function persistDespiteConflict() {
    if (!pending) return
    try {
      await persist(pending)
    } catch (error) {
      setConflicts([])
      setActionError(friendlyCalendarError(error))
    }
  }

  function requestEdit() {
    if (activeSelected?.occurrence.event.recurrenceSeriesId) setSeriesAction('redigera')
    else setMode('edit')
  }
  function requestDelete() {
    if (!activeSelected) return
    if (activeSelected.occurrence.event.recurrenceSeriesId) setSeriesAction('radera')
    else void removeEvent('series')
  }

  async function removeEvent(scope: RecurringActionScope) {
    if (!activeSelected) return
    try {
      await mutations.remove.mutateAsync({
        id: activeSelected.eventId,
        scope,
        date: scope === 'future' ? activeSelected.occurrence.occurrenceDate : undefined
      })
      closeDialog()
    } catch (error) {
      setActionError(friendlyCalendarError(error))
    }
  }
  function chooseSeriesScope(scope: RecurringActionScope) {
    if (!activeSelected || !seriesAction) return
    setSeriesAction(null)
    if (seriesAction === 'redigera') {
      setEditScope(scope)
      setMode('edit')
    } else void removeEvent(scope)
  }

  function eventForForm(): CalendarEvent | undefined {
    if (!activeSelected) return undefined
    const original = activeSelected.occurrence.event
    if (editScope !== 'future') return original
    if (original.allDay) {
      return {
        ...original,
        allDayStart: activeSelected.occurrence.occurrenceDate,
        allDayEnd: toDateKey(addDays(parseISO(activeSelected.endsAt), -1))
      }
    }
    return { ...original, startsAt: activeSelected.startsAt, endsAt: activeSelected.endsAt }
  }

  function priorOccurrenceCount(): number {
    const rule = activeSelected?.occurrence.recurrence
    if (!activeSelected || !rule) return 0
    return occurrencesBefore(
      rule,
      parseISO(singleOccurrence(activeSelected.occurrence.event).startsAt),
      activeSelected.occurrence.occurrenceDate
    )
  }

  function recurrenceForForm() {
    const rule = activeSelected?.occurrence.recurrence
    if (!rule || editScope !== 'future' || rule.occurrenceCount == null) return rule
    return { ...rule, occurrenceCount: Math.max(1, rule.occurrenceCount - priorOccurrenceCount()) }
  }

  const commonViewProps = { model, onSelect: selectItem }
  return (
    <section className="calendar-page">
      <CalendarToolbar
        title={model.title}
        view={navigation.view}
        onView={navigation.setView}
        onPrevious={navigation.previous}
        onNext={navigation.next}
        onToday={navigation.today}
        onCreate={() => createAt()}
      />
      {actionError && (
        <p className="calendar-action-error" role="alert">
          {actionError}
        </p>
      )}
      <button
        type="button"
        className="secondary-button mobile-filter-button"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((open) => !open)}
      >
        Filter
      </button>
      <div className="calendar-layout">
        <div className={`calendar-filter-panel ${filtersOpen ? 'open' : ''}`}>
          <CalendarFilters
            filters={filterState.filters}
            profiles={profiles.data ?? []}
            categories={categories.data ?? []}
            onParticipant={filterState.toggleParticipant}
            onCategory={filterState.toggleCategory}
            onMine={filterState.setMineOnly}
            onFamily={filterState.setFamilyOnly}
            onClear={filterState.clearFilters}
          />
        </div>
        <main className="calendar-canvas">
          <CalendarStatus
            loading={events.isLoading || profiles.isLoading || categories.isLoading}
            error={events.isError || profiles.isError || categories.isError}
            empty={!events.isLoading && !events.isError && (events.data?.length ?? 0) === 0}
            onRetry={() => {
              void events.refetch()
              void profiles.refetch()
              void categories.refetch()
            }}
          />
          {!events.isLoading && !events.isError && (
            <CalendarSwipeSurface
              enabled={navigation.view !== 'agenda'}
              onSwipe={(direction) => (direction === 1 ? navigation.next() : navigation.previous())}
            >
              {navigation.view === 'month' && (
                <CalendarMonthView {...commonViewProps} onCreate={createAt} />
              )}
              {navigation.view === 'week' && (
                <CalendarWeekView {...commonViewProps} onCreate={createAt} />
              )}
              {navigation.view === 'day' && (
                <CalendarDayView {...commonViewProps} onCreate={createAt} />
              )}
              {navigation.view === 'agenda' && <CalendarAgendaView {...commonViewProps} />}
            </CalendarSwipeSurface>
          )}
        </main>
      </div>
      {permissions.canManageCategories && (
        <button
          type="button"
          className="text-button manage-categories"
          onClick={() => setMode('categories')}
        >
          Hantera kategorier
        </button>
      )}
      <CalendarDialog
        title={activeMode === 'edit' ? 'Redigera aktivitet' : 'Ny aktivitet'}
        open={activeMode === 'create' || activeMode === 'edit'}
        onClose={closeDialog}
      >
        <CalendarEventForm
          event={activeMode === 'edit' ? eventForForm() : undefined}
          initialDate={initialDate}
          initialRecurrence={activeMode === 'edit' ? recurrenceForForm() : null}
          profiles={profiles.data ?? []}
          categories={categories.data ?? []}
          permissions={permissions}
          busy={mutations.save.isPending || mutations.split.isPending}
          onSubmit={(input) => void submit(input)}
          onCancel={closeDialog}
        />
      </CalendarDialog>
      <CalendarDialog
        title={activeSelected?.title ?? 'Aktivitet'}
        open={activeMode === 'details'}
        onClose={closeDialog}
      >
        {activeSelected && (
          <CalendarEventDetails
            item={activeSelected}
            permissions={permissions}
            onEdit={requestEdit}
            onDelete={requestDelete}
          />
        )}
      </CalendarDialog>
      <CalendarDialog
        title="Tidskonflikt"
        open={conflicts.length > 0}
        onClose={() => setConflicts([])}
      >
        <CalendarConflictWarning
          conflicts={conflicts}
          onBack={() => setConflicts([])}
          onSave={() => void persistDespiteConflict()}
        />
      </CalendarDialog>
      <CalendarDialog
        title="Återkommande aktivitet"
        open={Boolean(seriesAction)}
        onClose={() => setSeriesAction(null)}
      >
        {seriesAction && (
          <RecurringEventActionDialog
            action={seriesAction}
            onSeries={() => chooseSeriesScope('series')}
            onFuture={() => chooseSeriesScope('future')}
            onCancel={() => setSeriesAction(null)}
          />
        )}
      </CalendarDialog>
      <CalendarDialog title="Hantera kategorier" open={mode === 'categories'} onClose={closeDialog}>
        <CalendarCategoryManager categories={categories.data ?? []} />
      </CalendarDialog>
    </section>
  )
}
