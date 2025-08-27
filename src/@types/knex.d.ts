// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Knex } from 'knex'

export type Meal = {
  id: string
  name: string
  created_at: string
}

export type Food = {
  id: string
  name: string
  portion_type: 'unit' | 'grams'
  portion_amount: number
  protein_per_portion: number
}

export type CombinedMealWithFood = Meal & Food

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

    food: Food

    meals: Meal

    meal_foods: {
      id: string
      meal_id: string
      food_id: string
      amount: number
    }

    consumed_meals: {
      id: string
      meal_id: string
      created_at: string
      updated_at: string
    }
  }
}
