import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'

import { transactionsRoutes } from './routes/transactions'
import { dailyGoalRoutes } from './routes/daily-goal'

export const app = fastify()

app.register(fastifyCookie)

app.register(transactionsRoutes, {
  prefix: 'transactions',
})

app.register(dailyGoalRoutes, {
  prefix: 'daily-goal',
})
