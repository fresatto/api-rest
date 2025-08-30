import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('meals', (table) => {
    table.dropColumn('food_id')
    table.dropColumn('amount')
    table.string('name').nullable()
  })

  await knex('meals').update({ name: 'Refeição sem nome' })

  await knex.schema.alterTable('meals', (table) => {
    table.string('name').notNullable().alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('meals', (table) => {
    table.dropColumn('name')
    table.uuid('food_id').notNullable().references('id').inTable('food')
    table.integer('amount').notNullable()
  })
}
