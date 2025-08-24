import { z } from 'zod'
import { FastifyInstance } from 'fastify'
import { addHours, parseISO, startOfDay } from 'date-fns'

import { knex } from '../database'
import { fromZonedTime } from 'date-fns-tz'

export async function dailyGoalRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    try {
      const createDailyGoalBodySchema = z.object({
        protein: z.number(),
        carbohydrate: z.number().optional(),
        fat: z.number().optional(),
        calories: z.number().optional(),
      })

      const { protein } = createDailyGoalBodySchema.parse(request.body)

      const dailyGoal = await knex('daily_goal').first()

      if (dailyGoal) {
        await knex('daily_goal')
          .where({
            protein: dailyGoal.protein,
            created_at: dailyGoal.created_at,
          })
          .update({ protein })

        return reply.status(201).send({
          message: 'Daily goal updated',
          dailyGoal,
        })
      }

      await knex('daily_goal').insert({
        protein,
      })

      return reply.status(201).send()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: JSON.parse(error.message),
        })
      }

      return reply.status(500).send({
        error: 'Internal server error',
      })
    }
  })

  app.get('/', async (_, reply) => {
    const dailyGoal = await knex('daily_goal').first()

    return reply.status(200).send({ dailyGoal })
  })

  app.get('/summary', async (request, reply) => {
    try {
      const schema = z.object({
        startDate: z
          .string({
            error: 'Start date is required',
          })
          .regex(/^\d{4}-\d{2}-\d{2}$/, {
            error: 'Invalid date format. Please use YYYY-MM-DD format.',
          }),
        timezone: z.string({
          error: 'timezone is required.',
        }),
      })

      const { startDate, timezone } = schema.parse(request.query)

      // Interpretamos a data como midnight no timezone especificado
      const dateString = `${startDate}T00:00:00`
      const localDate = parseISO(dateString)
      const startOfDate = startOfDay(localDate)

      const utcInitialDate = fromZonedTime(startOfDate, timezone)
      const utcEndDate = fromZonedTime(addHours(startOfDate, 24), timezone)

      const allDailyMeals = await knex('meals')
        .select(
          'food.name',
          'meals.amount',
          'food.protein_per_portion',
          'food.portion_amount',
          'food.portion_type',
          'meals.created_at',
        )
        .innerJoin('food', 'meals.food_id', 'food.id')
        .whereBetween('meals.created_at', [utcInitialDate, utcEndDate])

      const dailyGoal = await knex('daily_goal').first()

      const proteinConsumed = allDailyMeals
        .reduce((acc, meal) => {
          if (meal.portion_type === 'unit') {
            return acc + meal.protein_per_portion * meal.amount
          }

          const proteinPerPortion =
            (meal.protein_per_portion * meal.amount) / meal.portion_amount

          return acc + proteinPerPortion
        }, 0)
        .toFixed(1)

      const achieved = proteinConsumed >= Number(dailyGoal?.protein)

      return reply.status(200).send({
        proteinConsumed: Number(proteinConsumed),
        achieved,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: JSON.parse(error.message),
        })
      }
    }
  })
}
