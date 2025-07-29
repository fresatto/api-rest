import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import cors from '@fastify/cors'

import { transactionsRoutes } from './routes/transactions'
import { dailyGoalRoutes } from './routes/daily-goal'
import { foodRoutes } from './routes/food'
import { mealsRoutes } from './routes/meals'

export const app = fastify()

app.register(fastifyCookie)
app.register(cors, {
  origin: true,
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
