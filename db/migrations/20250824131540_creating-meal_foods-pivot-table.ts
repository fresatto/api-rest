import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('meal_foods', (table) => {
    table.uuid('id').primary()
    table
      .uuid('meal_id')
      .notNullable()
      .references('id')
      .inTable('meals')
      .onDelete('CASCADE')
    table
      .uuid('food_id')
      .notNullable()
      .references('id')
      .inTable('food')
      .onDelete('CASCADE')
    table.float('amount').notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('meal_foods')
}
