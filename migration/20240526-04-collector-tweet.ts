import { sql, type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("collector")
        .createTable("tweet")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("twitter_id", "text", col => col.notNull())
        .addColumn("twitter_author_id", "text", col => col.notNull())
        .addColumn("text", "text", col => col.notNull())
        .addColumn("username", "text", col => col.notNull())
        .addColumn("urls", "jsonb", col => col.notNull())
        .addColumn("follower_count", "integer", col => col.notNull())
        .addColumn("following_count", "integer", col => col.notNull())
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .execute()

    await db.schema
        .withSchema("collector")
        .createIndex("collector_raydium_v4_address_idx")
        .on("raydium_v4")
        .column("pool_address")
        .unique()
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("collector")
        .dropTable("raydium_v4")
        .execute()
}
