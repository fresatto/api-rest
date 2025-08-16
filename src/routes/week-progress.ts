import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { endOfWeek, format, startOfWeek, subHours } from 'date-fns'
import { getDateToCompare } from '../utils/date'
import { getProteinConsumedByMeal } from '../utils/meals'

type WeekProgress = Record<
  string,
  { total: number; goalAchieved: boolean; dailyGoalPercentage: number }
>

export async function weekProgressRoutes(app: FastifyInstance) {
  app.get('/', async (_, reply) => {
    const weekStart = startOfWeek(new Date())
    const weekEnd = endOfWeek(new Date())

    const formattedWeekStart = getDateToCompare(weekStart)
    const formattedWeekEnd = getDateToCompare(weekEnd)

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
      .whereBetween('meals.created_at', [formattedWeekStart, formattedWeekEnd])

    const dailyGoal = await knex('daily_goal').first()

    console.log(weekProgress)

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
  })
}
