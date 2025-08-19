import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('food', (table) => {
    table.uuid('id').primary()
    table.string('name').notNullable()
    table.enum('portion_type', ['unit', 'grams']).notNullable()
    table.float('portion_amount').notNullable()
    table.float('protein_per_portion').notNullable()
    table
      .timestamp('created_at')
      .defaultTo(knex.raw("(now() at time zone 'utc')"))
      .notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('food')
}
