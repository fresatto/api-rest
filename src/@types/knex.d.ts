// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    transactions: {
      id: string
      title: string
      amount: number
      created_at: string
      session_id?: string
    }

    daily_goal: {
      protein: number
      carbohydrate?: number
      fat?: number
      calories?: number
      created_at: string
      session_id: string
    }

    food: {
      id: string
      name: string
      portion_type: 'unit' | 'grams'
      portion_amount: number
      protein_per_portion: number
      session_id: string
    }
  }
}
