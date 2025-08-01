import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { getTodayDataFilter } from '../utils/date'

export async function dailyGoalRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
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
  })

  app.get('/', async (request, reply) => {
    const dailyGoal = await knex('daily_goal').first()

    return reply.status(200).send({ dailyGoal })
  })

  app.get('/summary', async (request, reply) => {
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
      .groupBy('meals.id')

    const dailyGoal = await knex('daily_goal').first()

    const proteinConsumed = allDailyMeals
      .filter((meal) => getTodayDataFilter(meal.created_at))
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
