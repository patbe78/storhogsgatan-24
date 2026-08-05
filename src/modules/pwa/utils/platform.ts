export interface NavigatorLike {
  userAgent?: string
  maxTouchPoints?: number
  standalone?: boolean
}

export function isIosDevice(navigatorLike: NavigatorLike): boolean {
  const userAgent = navigatorLike.userAgent ?? ''
  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && (navigatorLike.maxTouchPoints ?? 0) > 1)
  )
}

export function isStandaloneDisplay(
  navigatorLike: NavigatorLike,
  matchesDisplayMode: boolean
): boolean {
  return matchesDisplayMode || navigatorLike.standalone === true
}
