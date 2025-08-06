import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { DB_DATE_FORMAT } from '../utils/date'
import { endOfDay, format, startOfDay, addHours } from 'date-fns'

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

  app.get('/summary', async (_, reply) => {
    const today = new Date()
    const todayInitial = format(addHours(startOfDay(today), 3), DB_DATE_FORMAT)
    const todayEnd = format(addHours(endOfDay(today), 3), DB_DATE_FORMAT)

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
      .whereBetween('meals.created_at', [todayInitial, todayEnd])
      .groupBy('meals.id')

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
  })
}
