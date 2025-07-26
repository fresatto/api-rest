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

    const sessionId = request.cookies.sessionId

    if (!sessionId) {
      reply.setCookie('sessionId', randomUUID(), {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 anos
      })
    }

    const { protein } = createDailyGoalBodySchema.parse(request.body)

    await knex('daily_goal').insert({
      protein,
      session_id: sessionId,
    })
  })
}
