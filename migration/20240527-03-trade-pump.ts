import { sql, type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("trade")
        .createTable("pump")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("name", "text", col => col.notNull())
        .addColumn("token_mint_address", "text", col => col.notNull())
        .addColumn("solana_buy_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("token_buy_amount", "numeric", col => col.notNull().defaultTo("0"))
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .execute()

    await db.schema
        .createIndex("trade_pump_name_token_mint_address_idx")
        .on("trade.pump")
        .columns(["name", "token_mint_address"])
        .unique()
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("trade")
        .dropTable("pump")
        .execute()
}