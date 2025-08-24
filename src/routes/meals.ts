import { z } from 'zod'
import { FastifyInstance } from 'fastify'

import { randomUUID } from 'node:crypto'

import { knex } from '../database'
import { addHours, startOfDay, parseISO } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    try {
      const schema = z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
          error: 'Invalid date format. Please use YYYY-MM-DD format.',
        }),
        timezone: z.string({
          error: 'Invalid timezone. Please use a valid timezone.',
        }),
      })

      const { startDate, timezone } = schema.parse(request.query)

      // Interpretamos a data como midnight no timezone especificado
      const dateString = `${startDate}T00:00:00`
      const localDate = parseISO(dateString)
      const startOfDate = startOfDay(localDate)

      // Convertemos para UTC considerando o timezone
      const utcInitialDate = fromZonedTime(startOfDate, timezone)
      const utcEndDate = fromZonedTime(addHours(startOfDate, 24), timezone)

      const meals = await knex('meals')
        .select('*')
        .whereBetween('meals.created_at', [utcInitialDate, utcEndDate])
        .orderBy('meals.created_at', 'asc')

      return reply.status(200).send({ meals })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: JSON.parse(error.message)[0].message,
        })
      }

      return reply.status(500).send({ message: 'Internal server error' })
    }
  })

  app.post('/', async (request, reply) => {
    try {
      const createMealBodySchema = z.object({
        name: z.string('name is required').min(1, 'name is required'),
        items: z
          .array(
            z.object({
              food_id: z
                .uuid('food_id must be a valid UUID')
                .min(1, 'food_id is required'),
              amount: z
                .number('amount is required')
                .min(1, 'amount is required'),
            }),
            { error: 'items must be an array' },
          )
          .min(1, 'items must have at least one item'),
      })

      const { name, items } = createMealBodySchema.parse(request.body)

      const [meal] = await knex('meals')
        .insert({
          id: randomUUID(),
          name,
        })
        .returning('*')

      const mealFoods = items.map((item) => {
        return {
          id: randomUUID(),
          meal_id: meal.id,
          food_id: item.food_id,
          amount: item.amount,
        }
      })

      await knex('meal_foods').insert(mealFoods)

      return reply.status(201).send({
        ...meal,
        items,
      })
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
