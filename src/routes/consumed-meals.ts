import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { knex } from '../database'
import { getCurrentDateInitialAndEndDateInTimezone } from '../utils/date'

export function consumedMealsRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    try {
      const timezone = request.headers['x-timezone'] as string

      const { utcInitialDate, utcEndDate } =
        getCurrentDateInitialAndEndDateInTimezone(timezone)

      const meals = await knex('consumed_meals')
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

      return reply.status(200).send({ meals })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: JSON.parse(error.message)[0].message,
        })
      }

      return reply
        .status(500)
        .send({ message: 'Internal server error' + error })
    }
  })

  app.post('/', async (request, reply) => {
    try {
      const schema = z.object({
        meal_id: z.uuid(),
      })

      const { meal_id } = schema.parse(request.body)

      const meal = await knex('meals').where('id', meal_id).first()

      if (!meal) {
        return reply.status(404).send({ message: 'Meal not found' })
      }

      const consumedMeal = await knex('consumed_meals')
        .insert({
          id: randomUUID(),
          meal_id,
        })
        .returning('*')

      return reply.status(201).send({ consumedMeal })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: JSON.parse(error.message)[0].message,
        })
      }

      return reply
        .status(500)
        .send({ message: 'Internal server error' + error })
    }
  })
}
