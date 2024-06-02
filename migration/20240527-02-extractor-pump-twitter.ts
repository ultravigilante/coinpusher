import { sql, type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("extractor")
        .createTable("pump_twitter")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("variant", "text", col => col.notNull())
        .addColumn("tweet_url", "text", col => col.notNull())
        .addColumn("follower_count", "integer", col => col.notNull())
        .addColumn("token_mint", "text", col => col.notNull())
        .addColumn("solana_buy_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("token_buy_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .execute()

    await db.schema
        .createIndex("extractor_pump_twitter_variant_token_mint_idx")
        .on("extractor.pump_twitter")
        .columns(["variant", "token_mint"])
        .unique()
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("extractor")
        .dropTable("pump_twitter")
        .execute()
}