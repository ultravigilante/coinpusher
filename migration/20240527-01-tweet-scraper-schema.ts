import { type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .createSchema("tweet_scraper")
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .dropSchema("tweet_scraper")
        .execute()
}
