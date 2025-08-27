import { FastifyInstance } from 'fastify'
import { addHours, startOfDay, parseISO } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { knex } from '../database'

export function consumedMealsRoutes(app: FastifyInstance) {
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

      const meals = await knex('consumed_meals')
        .select('*')
        .whereBetween('created_at', [utcInitialDate, utcEndDate])

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

      console.log({ meal_id, meal })

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
