import type { Kysely } from "kysely"

export const up = async (db: Kysely<any>) => {
    await db.schema
        .withSchema("tweet_scraper")
        .createTable("pump_mention")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("twitter_username", "text", col => col.notNull())
        .addColumn("tweet_id", "text", col => col.notNull())
        .addColumn("follower_count", "integer", col => col.notNull())
        .addColumn("pump_mint_address", "text", col => col.notNull())
        .addColumn("created_at", "timestamp", col => col.notNull())
        .execute()
}

export const down = async (db: Kysely<any>) => {
    await db.schema
        .withSchema("pump_mention")
        .dropTable("pump_tweet")
        .execute()
}