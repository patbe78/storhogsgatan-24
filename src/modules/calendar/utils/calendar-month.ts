import { getISOWeek } from 'date-fns'
import type { CalendarDayModel, CalendarViewItem, CalendarViewModel } from '../types/calendar-view'
import { addDateKeyDays, parseDateKey, toDateKey } from './calendar-dates'

export interface CalendarMonthSegment {
  item: CalendarViewItem
  startColumn: number
  span: number
  lane: number
  isStart: boolean
  isEnd: boolean
}

export interface CalendarMonthWeek {
  key: string
  weekNumber: number
  days: CalendarDayModel[]
  segments: CalendarMonthSegment[]
  laneCount: number
}

interface PendingSegment extends Omit<CalendarMonthSegment, 'lane'> {
  preferredLane?: number
}

function allDayDateRange(item: CalendarViewItem) {
  return {
    start: toDateKey(new Date(item.startsAt)),
    end: toDateKey(new Date(item.endsAt))
  }
}

function segmentForWeek(
  item: CalendarViewItem,
  days: CalendarDayModel[],
  preferredLane?: number
): PendingSegment | null {
  const range = allDayDateRange(item)
  const firstIndex = days.findIndex((day) => day.date >= range.start && day.date < range.end)
  let lastIndex = -1
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].date >= range.start && days[index].date < range.end) {
      lastIndex = index
      break
    }
  }
  if (firstIndex === -1 || lastIndex === -1) return null
  return {
    item,
    startColumn: firstIndex + 1,
    span: lastIndex - firstIndex + 1,
    isStart: days[firstIndex].date === range.start,
    isEnd: days[lastIndex].date === addDateKeyDays(range.end, -1),
    preferredLane
  }
}

function rangesOverlap(a: CalendarMonthSegment, b: PendingSegment): boolean {
  const aEnd = a.startColumn + a.span - 1
  const bEnd = b.startColumn + b.span - 1
  return a.startColumn <= bEnd && b.startColumn <= aEnd
}

function placeSegments(pending: PendingSegment[]): CalendarMonthSegment[] {
  const placed: CalendarMonthSegment[] = []
  const ordered = [...pending].sort(
    (a, b) =>
      Number(b.preferredLane != null) - Number(a.preferredLane != null) ||
      a.startColumn - b.startColumn ||
      b.span - a.span ||
      a.item.key.localeCompare(b.item.key)
  )

  for (const segment of ordered) {
    const laneAvailable = (lane: number) =>
      !placed.some((candidate) => candidate.lane === lane && rangesOverlap(candidate, segment))
    let lane = segment.preferredLane
    if (lane == null || !laneAvailable(lane)) {
      lane = 0
      while (!laneAvailable(lane)) lane += 1
    }
    placed.push({
      item: segment.item,
      startColumn: segment.startColumn,
      span: segment.span,
      lane,
      isStart: segment.isStart,
      isEnd: segment.isEnd
    })
  }
  return placed.sort((a, b) => a.lane - b.lane || a.startColumn - b.startColumn)
}

export function isoWeekNumber(date: Date): number {
  return getISOWeek(date)
}

export function createCalendarMonthWeeks(model: CalendarViewModel): CalendarMonthWeek[] {
  const weeks: CalendarMonthWeek[] = []
  const preferredLanes = new Map<string, number>()
  const allDayItems = model.items.filter((item) => item.allDay)

  for (let offset = 0; offset < model.days.length; offset += 7) {
    const days = model.days.slice(offset, offset + 7)
    if (!days.length) continue
    const pending = allDayItems
      .map((item) => segmentForWeek(item, days, preferredLanes.get(item.key)))
      .filter((segment): segment is PendingSegment => segment != null)
    const segments = placeSegments(pending)
    for (const segment of segments) preferredLanes.set(segment.item.key, segment.lane)
    weeks.push({
      key: days[0].date,
      weekNumber: isoWeekNumber(parseDateKey(days[0].date)),
      days,
      segments,
      laneCount: segments.reduce((count, segment) => Math.max(count, segment.lane + 1), 0)
    })
  }
  return weeks
}
