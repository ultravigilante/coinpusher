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
        .addColumn("follower_count", "integer", col => col.notNull())
        .addColumn("following_count", "integer", col => col.notNull())
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .execute()

    await db.schema
        .withSchema("collector")
        .createTable("tweet_pump_token_mint_address")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("tweet_id", "integer", col => col
            .notNull()
            .references("collector.tweet.id")
        )
        .addColumn("token_mint_address", "text", col => col.notNull())
        .execute()

    await db.schema
        .withSchema("collector")
        .createTable("tweet_dexscreener_pool_address")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("tweet_id", "integer", col => col
            .notNull()
            .references("collector.tweet.id")
        )
        .addColumn("pool_address", "text", col => col.notNull())
        .execute()

    await db.schema
        .withSchema("collector")
        .createIndex("collector_tweet_twitter_id")
        .on("tweet")
        .column("twitter_id")
        .unique()
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("collector")
        .dropTable("tweet_dexscreener_pool_address")
        .execute()

    await db.schema
        .withSchema("collector")
        .dropTable("tweet_pump_token_mint_address")
        .execute()

    await db.schema
        .withSchema("collector")
        .dropTable("tweet")
        .execute()
}
