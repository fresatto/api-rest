import { addHours, format, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const DB_DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss'

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

export function getDateToCompare(date: string | Date): string {
  const isISODate = typeof date === 'string' && date.includes('T')

  //  Postgres date
  if (isISODate) {
    return date
  }

  // SQLite date
  return format(addHours(date, 3), DB_DATE_FORMAT)
}
