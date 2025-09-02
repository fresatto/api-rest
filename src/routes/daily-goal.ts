import { z } from 'zod'
import { FastifyInstance } from 'fastify'

import { knex } from '../database'
import { getCurrentDateInitialAndEndDateInTimezone } from '../utils/date'

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
      const timezone = request.headers['x-timezone'] as string
      const { utcInitialDate, utcEndDate } =
        getCurrentDateInitialAndEndDateInTimezone(timezone)

      const allDailyMeals = await knex('consumed_meals')
        .select(
          'consumed_meals.id',
          'meals.name as name',
          'consumed_meals.created_at',
          knex.raw(`
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', meal_foods.id,
              'food_id', food.id,
              'food_name', food.name,
              'portion_type', food.portion_type,
              'portion_amount', food.portion_amount,
              'protein_per_portion', food.protein_per_portion,
              'amount', meal_foods.amount,
              'calculated_protein', ROUND(
                (food.protein_per_portion * meal_foods.amount / food.portion_amount)::numeric,
                2
              )
            )
            ORDER BY meal_foods.created_at
          ) as items
        `),
          knex.raw(`
          ROUND(
            SUM(
              (food.protein_per_portion * meal_foods.amount / food.portion_amount)
            )::numeric,
            2
          ) as total_protein
        `),
        )
        .innerJoin('meals', 'consumed_meals.meal_id', 'meals.id')
        .innerJoin('meal_foods', 'consumed_meals.meal_id', 'meal_foods.meal_id')
        .innerJoin('food', 'meal_foods.food_id', 'food.id')
        .groupBy(
          'consumed_meals.id',
          'consumed_meals.created_at',
          'consumed_meals.meal_id',
          'meals.name',
        )
        .whereBetween('consumed_meals.created_at', [utcInitialDate, utcEndDate])
        .orderBy('consumed_meals.created_at', 'desc')

      const dailyGoal = await knex('daily_goal').first()

      const proteinConsumed = allDailyMeals.reduce((acc, meal) => {
        return acc + Number(meal.total_protein)
      }, 0)

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

      return reply.status(500).send({
        error: 'Internal server error',
      })
    }
  })
}
