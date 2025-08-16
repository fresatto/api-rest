import { z } from 'zod'
import { FastifyInstance } from 'fastify'
import { endOfDay, startOfDay } from 'date-fns'

import { knex } from '../database'
import { getDateToCompare } from '../utils/date'

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

  app.get('/summary', async (_, reply) => {
    const today = new Date()

    const todayInitial = getDateToCompare(startOfDay(today))
    const todayEnd = getDateToCompare(endOfDay(today))

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
