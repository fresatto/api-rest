import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { knex } from '../database'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const { sessionId } = request.cookies

    const meals = await knex('meals')
      .where('meals.session_id', sessionId)
      .select([
        'meals.id',
        'meals.amount',
        'meals.session_id',
        'meals.created_at',
        'food.name',
        'food.portion_type',
        'food.portion_amount',
        'food.protein_per_portion',
      ])
      .innerJoin('food', 'meals.food_id', 'food.id')
      .groupBy('meals.id')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mealsWithFoodDetails = meals.map((meal: any) => {
      const { id, amount, created_at } = meal

      const proteinConsumed =
        (meal.protein_per_portion * meal.amount) / meal.portion_amount

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

    const sessionId = request.cookies.sessionId

    const meal = {
      id: randomUUID(),
      food_id,
      amount,
    }

    await knex('meals').insert({
      ...meal,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
}
