import fastify from 'fastify'
import crypto from 'node:crypto'

import { knex } from './database'
import { env } from './env'

const app = fastify()

app.get('/', async () => {
  const transactions = await knex('transactions')
    .insert({
      id: crypto.randomUUID(),
      title: 'New transaction',
      amount: 5000,
    })
    .returning('*')

  return transactions
})

app.get('/t', async () => {
  const transactions = await knex('transactions').select('*')

  return transactions
})

app.listen({ port: env.PORT }).then(() => {
  console.log(`Server is running on port ${env.PORT}`)
})
