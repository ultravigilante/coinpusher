import { type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .createSchema("collector")
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .dropSchema("collector")
        .execute()
}
