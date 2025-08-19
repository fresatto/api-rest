import { knex as setupKnex, Knex } from 'knex'
import { env } from './env'

const connection = env.DATABASE_URL

export const knexConfig: Knex.Config = {
  client: env.DATABASE_CLIENT,
  connection: {
    connectionString: connection,
    timezone: 'utc',
  },
  useNullAsDefault: true,
  migrations: {
    extension: 'ts',
    directory: './db/migrations',
  },
}

export const knex = setupKnex(knexConfig)
