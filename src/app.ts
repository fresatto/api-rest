import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import cors from '@fastify/cors'

import { transactionsRoutes } from './routes/transactions'
import { dailyGoalRoutes } from './routes/daily-goal'
import { foodRoutes } from './routes/food'
import { mealsRoutes } from './routes/meals'
import { weekProgressRoutes } from './routes/week-progress'
import { consumedMealsRoutes } from './routes/consumed-meals'

export const app = fastify()

app.register(fastifyCookie)
app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

app.register(transactionsRoutes, {
  prefix: 'transactions',
})

app.register(dailyGoalRoutes, {
  prefix: 'daily-goal',
})

app.register(foodRoutes, {
  prefix: 'food',
})

app.register(mealsRoutes, {
  prefix: 'meals',
})

app.register(consumedMealsRoutes, {
  prefix: 'consumed-meals',
})

app.register(weekProgressRoutes, {
  prefix: 'week-progress',
})
