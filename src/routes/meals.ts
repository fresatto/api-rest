import { z } from 'zod'
import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

import { knex } from '../database'

interface CountResult {
  count: string | number
}

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    try {
      const getMealsQuerySchema = z.object({
        page: z.coerce.number().min(1).default(1),
        size: z.coerce.number().min(1).max(100).default(10),
        search: z.string().optional(),
      })

      const { page, size, search } = getMealsQuerySchema.parse(request.query)

      const offset = (page - 1) * size

      let baseQuery = knex('meals')
        .select(
          'meals.id',
          'meals.name',
          'meals.created_at',
          knex.raw(`
            COALESCE(
              JSON_AGG(
                CASE 
                  WHEN food.id IS NOT NULL THEN
                    JSON_BUILD_OBJECT(
                      'food_id', food.id,
                      'food_name', food.name,
                      'portion_type', food.portion_type,
                      'portion_amount', food.portion_amount,
                      'protein_per_portion', food.protein_per_portion,
                      'amount', meal_foods.amount,
                      'calculated_protein', ROUND(
                        (food.protein_per_portion * meal_foods.amount / food.portion_amount)::numeric, 
                        2
                      )
                    )
                  ELSE NULL
                END
              ) FILTER (WHERE food.id IS NOT NULL),
              '[]'::json
            ) as items
          `),
          knex.raw(`
            COALESCE(
              ROUND(
                SUM(
                  CASE 
                    WHEN food.id IS NOT NULL THEN 
                      (food.protein_per_portion * meal_foods.amount / food.portion_amount)
                    ELSE 0 
                  END
                )::numeric, 
                2
              ), 
              0
            ) as total_protein
          `),
        )
        .leftJoin('meal_foods', 'meals.id', 'meal_foods.meal_id')
        .leftJoin('food', 'meal_foods.food_id', 'food.id')

      // Aplicar filtro de busca se fornecido
      if (search) {
        baseQuery = baseQuery.where('meals.name', 'ilike', `%${search}%`)
      }

      // Contar total de registros para paginação
      const countQuery = knex('meals')
      if (search) {
        countQuery.where('meals.name', 'ilike', `%${search}%`)
      }
      const countResult = await countQuery.count('* as count')
      const totalItems = Number(
        (countResult[0] as unknown as CountResult).count,
      )

      // Buscar refeições com paginação
      const meals = await baseQuery
        .groupBy('meals.id', 'meals.name', 'meals.created_at')
        .orderBy('meals.created_at', 'desc')
        .limit(size)
        .offset(offset)

      const totalPages = Math.ceil(totalItems / size)

      return reply.status(200).send({
        meals,
        pagination: {
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
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
