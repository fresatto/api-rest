import { it, expect, beforeAll, afterAll, describe, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'

import { app } from '../app'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    const response = await request(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 5000,
      type: 'credit',
    })

    expect(response.status).toBe(201)
  })

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie')

    if (!cookies) {
      throw new Error('Cookie not found')
    }

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)

    expect(listTransactionsResponse.status).toBe(200)
    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    ])
  })

  it('should be able to get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie')

    if (!cookies) {
      throw new Error('Cookie not found')
    }

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)

    const transactionId = listTransactionsResponse.body.transactions[0].id

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)

    console.log(getTransactionResponse.body.transaction.id)

    expect(getTransactionResponse.status).toBe(200)
    expect(getTransactionResponse.body.transaction.id).toBe(transactionId)
  })

  it.only('should be able to get the summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'Debit transaction',
        amount: 2000,
        type: 'debit',
      })

    const cookie = createTransactionResponse.get('Set-Cookie')

    if (!cookie) {
      throw new Error('Cookie not found')
    }

    await request(app.server).post('/transactions').set('Cookie', cookie).send({
      title: 'Credit transaction',
      amount: 5000,
      type: 'credit',
    })

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookie)

    expect(summaryResponse.status).toBe(200)
    expect(summaryResponse.body.summary).toEqual({
      amount: 3000,
    })
  })
})
