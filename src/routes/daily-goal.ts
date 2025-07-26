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
}
