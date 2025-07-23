import fastify from 'fastify'
import { knex } from './database'
import crypto from 'node:crypto'

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

app.listen({ port: 3000 }).then(() => {
  console.log('Server is running on port 3000')
})
