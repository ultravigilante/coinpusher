import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import env from "../env"
import type { DB } from "../../type/database.gen"

export type Database = Kysely<DB>

export const pool = new Pool({ 
    connectionString: env.core.databaseURL 
})

export const database : Database = new Kysely<DB>({
    dialect: new PostgresDialect({ pool })
})