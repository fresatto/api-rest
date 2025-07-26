import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('daily_goal', (table) => {
    table.uuid('session_id').notNullable()
    table.integer('protein').notNullable()
    table.integer('carbohydrate')
    table.integer('fat')
    table.integer('calories')
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('daily_goal')
}
