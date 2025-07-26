import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'

export async function foodRoutes(app: FastifyInstance) {
  app.addHook('preHandler', checkSessionIdExists)

  app.post('/', async (request, reply) => {
    const createFoodBodySchema = z.object({
      name: z.string(),
      portion_type: z.enum(['unit', 'grams']),
      portion_amount: z.number(),
      protein_per_portion: z.number(),
    })

    const sessionId = request.cookies.sessionId

    const { name, portion_type, portion_amount, protein_per_portion } =
      createFoodBodySchema.parse(request.body)

    const food = {
      id: randomUUID(),
      name,
      portion_type,
      portion_amount,
      protein_per_portion,
    }

    await knex('food').insert({
      ...food,
      session_id: sessionId,
    })

    return reply.status(201).send(food)
  })

  app.delete('/:id', async (request, reply) => {
    const deleteFoodParamsSchema = z.object({
      id: z.string(),
    })

    const { id } = deleteFoodParamsSchema.parse(request.params)

    await knex('food').where('id', id).delete()

    return reply.status(204).send()
  })
}
