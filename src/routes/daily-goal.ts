import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { randomUUID } from 'node:crypto'

export async function dailyGoalRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createDailyGoalBodySchema = z.object({
      protein: z.number(),
      carbohydrate: z.number().optional(),
      fat: z.number().optional(),
      calories: z.number().optional(),
    })

    const sessionId = randomUUID()

    const { protein } = createDailyGoalBodySchema.parse(request.body)

    reply.setCookie('sessionId', sessionId, {
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 anos
    })

    await knex('daily_goal').insert({
      protein,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })

  app.get('/', async (request, reply) => {
    const { sessionId } = request.cookies

    const dailyGoal = await knex('daily_goal')
      .where('session_id', sessionId)
      .first()

    return reply.status(200).send({ dailyGoal })
  })

  app.get('/summary', async (request, reply) => {
    const { sessionId } = request.cookies

    const allDailyMeals = await knex('meals')
      .where('meals.session_id', sessionId)
      .andWhere(
        'meals.created_at',
        '>=',
        new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      )
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

    const dailyGoal = await knex('daily_goal')
      .where('session_id', sessionId)
      .first()

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
