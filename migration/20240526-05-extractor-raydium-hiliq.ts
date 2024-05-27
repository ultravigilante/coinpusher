import { sql, type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("extractor")
        .createTable("shaxian_raydium_v4")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("variant", "text", col => col.notNull())
        .addColumn("pool_address", "text", col => col.notNull())
        .addColumn("is_token_base", "boolean", col => col.notNull())
        .addColumn("liquidity_burnt_at", "timestamp")
        .addColumn("buy_solana_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("buy_token_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("sell_solana_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("sell_token_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .execute()

    await db.schema
        .withSchema("extractor")
        .createTable("shaxian_raydium_v4_trade")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("shaxian_raydium_v4_id", "integer", col => col
            .notNull()
            .references("extractor.shaxian_raydium_v4.id")
        )
        .addColumn("transaction_signature", "text", col => col.notNull())
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .execute()

    await db.schema
        .withSchema("extractor")
        .createIndex("extractor_shaxian_raydium_v4_variant_pool_address_idx")
        .on("shaxian_raydium_v4")
        .columns(["variant", "pool_address"])
        .unique()
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("extractor")
        .dropTable("shaxian_raydium_v4_trade")
        .execute()

    await db.schema
        .withSchema("extractor")
        .dropTable("shaxian_raydium_v4")
        .execute()
}
