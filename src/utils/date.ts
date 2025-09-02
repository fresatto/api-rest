import { addHours, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const DB_DATE_FORMAT = 'yyyy-MM-dd'

export const getCurrentDateInTimezone = (timezone: string) => {
  return toZonedTime(new Date(), timezone)
}

export const getCurrentDateInitialAndEndDateInTimezone = (timezone: string) => {
  const currentDay = getCurrentDateInTimezone(timezone)
  const startOfCurrentDay = startOfDay(currentDay)

  const utcInitialDate = fromZonedTime(startOfCurrentDay, timezone)
  const utcEndDate = fromZonedTime(addHours(startOfCurrentDay, 24), timezone)

  console.log({ utcInitialDate, utcEndDate, startOfCurrentDay, timezone })

  return { utcInitialDate, utcEndDate }
}
