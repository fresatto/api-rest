import { addHours, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const DB_DATE_FORMAT = 'yyyy-MM-dd'

export const getCurrentDateInitialAndEndDateInTimezone = (timezone: string) => {
  const currentDay = toZonedTime(new Date(), timezone)

  const utcInitialDate = startOfDay(currentDay)
  const utcEndDate = addHours(utcInitialDate, 24)

  console.log({ currentDay, utcInitialDate, utcEndDate })

  return { utcInitialDate, utcEndDate }
}
