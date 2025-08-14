import { CombinedMealWithFood } from '../@types/knex'

export function getProteinConsumedByMeal(meal: CombinedMealWithFood) {
  try {
    return meal.portion_type === 'unit'
      ? meal.protein_per_portion * meal.amount
      : (meal.protein_per_portion * meal.amount) / meal.portion_amount
  } catch {
    throw new Error(
      'Failed to get protein consumed by meal. Check getProteinConsumedByMeal',
    )
  }
}
