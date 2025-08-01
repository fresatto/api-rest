import { startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export function dateToUTC(date: string) {
  return date.replace(' ', 'T') + 'Z'
}

export function parseDateToLocalUTC(date: string) {
  const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone

  const dateInUtc = dateToUTC(date)

  return toZonedTime(dateInUtc, timeZone)
}

export function getTodayDataFilter(date: string): boolean {
  const utcDate = dateToUTC(date)

  return new Date(utcDate) > startOfDay(new Date())
}
