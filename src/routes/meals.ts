import { format } from 'date-fns-tz'
import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { knex } from '../database'
import { addHours, endOfDay, startOfDay, subDays, subMonths } from 'date-fns'
import { DB_DATE_FORMAT } from '../utils/date'
import { Period } from '../@types/period'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const paramsSchema = z.object({
      period: z
        .enum([
          Period.TODAY,
          Period.YESTERDAY,
          Period.LAST_7_DAYS,
          Period.MONTH,
        ])
        .optional()
        .default(Period.TODAY),
    })

    try {
      const { period } = paramsSchema.parse(request.query)

      const today = new Date()
      const todayInitial = format(
        addHours(startOfDay(today), 3),
        DB_DATE_FORMAT,
      )
      const todayEnd = format(addHours(endOfDay(today), 3), DB_DATE_FORMAT)

      const yesterday = subDays(today, 1)
      const yesterdayInitial = format(startOfDay(yesterday), DB_DATE_FORMAT)
      const yesterdayEnd = format(endOfDay(yesterday), DB_DATE_FORMAT)

      const sevenDaysAgo = subDays(today, 7)
      const sevenDaysAgoInitial = format(
        startOfDay(sevenDaysAgo),
        DB_DATE_FORMAT,
      )

      const oneMonthAgo = subMonths(today, 1)
      const oneMonthAgoInitial = format(startOfDay(oneMonthAgo), DB_DATE_FORMAT)

      // TODO: Remover depois de publicar
      await new Promise((resolve) => setTimeout(resolve, 1000))

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
        .where((builder) => {
          switch (period) {
            case Period.YESTERDAY:
              return builder.whereBetween('meals.created_at', [
                yesterdayInitial,
                yesterdayEnd,
              ])
            case Period.LAST_7_DAYS:
              return builder.whereBetween('meals.created_at', [
                sevenDaysAgoInitial,
                todayEnd,
              ])
            case Period.MONTH:
              return builder.whereBetween('meals.created_at', [
                oneMonthAgoInitial,
                todayEnd,
              ])
            default:
              return builder.whereBetween('meals.created_at', [
                todayInitial,
                todayEnd,
              ])
          }
        })
        .orderBy('meals.created_at', 'asc')

      const mealsWithFoodDetails = meals
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((meal: any) => {
          const { id, amount, created_at } = meal

          const proteinConsumed =
            meal.portion_type === 'unit'
              ? meal.protein_per_portion * meal.amount
              : (meal.protein_per_portion * meal.amount) / meal.portion_amount

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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: JSON.parse(error.message),
        })
      }

      return reply.status(500).send({
        error: 'Internal server error',
      })
    }
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
