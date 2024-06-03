import { sql, type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("trade")
        .createTable("raydium")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("name", "text", col => col.notNull())
        .addColumn("pool_address", "text", col => col.notNull())
        .addColumn("is_target_base", "boolean", col => col.notNull())
        .addColumn("solana_buy_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("token_buy_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .execute()

    await db.schema
        .createIndex("trade_raydium_name_pool_address_idx")
        .on("trade.raydium")
        .columns(["name", "pool_address"])
        .unique()
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("trade")
        .dropTable("raydium")
        .execute()
}