import { z } from 'zod'
import { FastifyInstance } from 'fastify'

import { randomUUID } from 'node:crypto'

import { knex } from '../database'
import { getProteinConsumedByMeal } from '../utils/meals'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', async (_, reply) => {
    const meals = await knex('meals')
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
      .orderBy('meals.created_at', 'asc')

    const mealsWithFoodDetails = meals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((meal: any) => {
        const { id, amount, created_at } = meal

        const proteinConsumed = getProteinConsumedByMeal(meal)

        return {
          id,
          amount,
          created_at,
          proteinConsumed,
          food: {
            name: meal.name,
            portion_type: meal.portion_type,
            portion_amount: meal.portion_amount,
            protein_per_portion: meal.protein_per_portion,
          },
        }
      })

    return reply.status(200).send({ meals: mealsWithFoodDetails })
  })

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      food_id: z.string(),
      amount: z.number(),
    })

    const { food_id, amount } = createMealBodySchema.parse(request.body)

    const food = await knex('food').where('id', food_id).first()

    if (!food) {
      return reply.status(400).send({ message: 'Food not found' })
    }

    const meal = {
      id: randomUUID(),
      food_id,
      amount,
    }

    await knex('meals').insert({
      ...meal,
    })

    return reply.status(201).send()
  })

  app.delete('/:id', async (request, reply) => {
    const deleteMealParamsSchema = z.object({
      id: z.string(),
    })

    const { id } = deleteMealParamsSchema.parse(request.params)

    const meal = await knex('meals').where('id', id).first()

    if (!meal) {
      return reply.status(404).send({ message: 'Meal not found' })
    }

    await knex('meals').where('id', id).delete()

    return reply.status(204).send()
  })
}
