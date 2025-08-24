import { FastifyInstance } from 'fastify'
import z from 'zod'
import { fromZonedTime } from 'date-fns-tz'
import { endOfWeek, format, parseISO, startOfWeek, subHours } from 'date-fns'

import { knex } from '../database'
import { getProteinConsumedByMeal } from '../utils/meals'

type WeekProgress = Record<
  string,
  { total: number; goalAchieved: boolean; dailyGoalPercentage: number }
>

export async function weekProgressRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    try {
      const schema = z.object({
        startDate: z
          .string({
            error: 'startDate is required.',
          })
          .regex(/^\d{4}-\d{2}-\d{2}$/, {
            error: 'Invalid date format. Please use YYYY-MM-DD format.',
          }),
        timezone: z.string({
          error: 'timezone is required.',
        }),
      })

      const { startDate, timezone } = schema.parse(request.query)

      const dateString = `${startDate}T00:00:00`
      const localDate = parseISO(dateString)

      const weekStart = startOfWeek(localDate)
      const weekEnd = endOfWeek(localDate)

      const formattedWeekStart = fromZonedTime(weekStart, timezone)
      const formattedWeekEnd = fromZonedTime(weekEnd, timezone)

      const weekProgress = await knex('meals')
        .select([
          'meals.id',
          'meals.amount',
          'meals.created_at',
          'food.name',
          'food.portion_type',
          'food.portion_amount',
          'food.protein_per_portion',
        ])
        .innerJoin('food', 'meals.food_id', 'food.id')
        .whereBetween('meals.created_at', [
          formattedWeekStart,
          formattedWeekEnd,
        ])

      const dailyGoal = await knex('daily_goal').first()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupedByDay = weekProgress.reduce(
        (acc, meal: any) => {
          const day = format(subHours(meal.created_at, 3), 'EEEE').toLowerCase()

          if (!acc[day]) {
            acc[day] = {
              total: 0,
              goalAchieved: false,
            }
          }

          acc[day].total += getProteinConsumedByMeal(meal)
          acc[day].goalAchieved = acc[day].total >= Number(dailyGoal?.protein)
          acc[day].dailyGoalPercentage = Number(
            Number((acc[day].total / Number(dailyGoal?.protein)) * 100).toFixed(
              1,
            ),
          )

          return acc
        },
        {
          sunday: { total: 0, goalAchieved: false, dailyGoalPercentage: 0 },
          monday: { total: 0, goalAchieved: false, dailyGoalPercentage: 0 },
          tuesday: { total: 0, goalAchieved: false, dailyGoalPercentage: 0 },
          wednesday: { total: 0, goalAchieved: false, dailyGoalPercentage: 0 },
          thursday: { total: 0, goalAchieved: false, dailyGoalPercentage: 0 },
          friday: { total: 0, goalAchieved: false, dailyGoalPercentage: 0 },
          saturday: { total: 0, goalAchieved: false, dailyGoalPercentage: 0 },
        } as WeekProgress,
      )

      return reply.status(200).send({ weekProgress: groupedByDay })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: JSON.parse(error.message),
        })
      }
    }
  })
}
