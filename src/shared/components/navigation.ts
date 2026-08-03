import {
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Settings,
  Shirt,
  type LucideIcon
} from 'lucide-react'
export type NavigationItem = { label: string; path: string; icon: LucideIcon }
export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Kalender', path: '/kalender', icon: CalendarDays },
  { label: 'Tvättbokning', path: '/tvattbokning', icon: Shirt },
  { label: 'Inköpslista', path: '/inkopslista', icon: ListChecks },
  { label: 'Inställningar', path: '/installningar', icon: Settings }
]
