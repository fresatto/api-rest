import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { randomUUID } from 'node:crypto'

export async function foodRoutes(app: FastifyInstance) {
  app.get('/', async (_, reply) => {
    const foods = await knex('food').select(
      'id',
      'name',
      'portion_type',
      'portion_amount',
      'protein_per_portion',
    )

    return reply.status(200).send({ foods })
  })

  app.post('/', async (request, reply) => {
    const createFoodBodySchema = z.object({
      name: z.string(),
      portion_type: z.enum(['unit', 'grams']),
      portion_amount: z.number(),
      protein_per_portion: z.number(),
    })

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
