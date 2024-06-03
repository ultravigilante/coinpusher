import { sql, type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("collector")
        .createTable("raydium_v4")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("pool_address", "text", col => col.notNull())
        .addColumn("token_base_mint_address", "text", col => col.notNull())
        .addColumn("token_quote_mint_address", "text", col => col.notNull())
        .addColumn("liquidity_token_mint_address", "text", col => col.notNull())
        .addColumn("token_base_vault_address", "text", col => col.notNull())
        .addColumn("token_quote_vault_address", "text", col => col.notNull())
        .addColumn("token_base_added_amount", "numeric", col => col.notNull())
        .addColumn("token_quote_added_amount", "numeric", col => col.notNull())
        .addColumn("token_base_removed_amount", "numeric", col => col.notNull())
        .addColumn("token_quote_removed_amount", "numeric", col => col.notNull())
        .addColumn("token_base_amount", "numeric", col => col.notNull())
        .addColumn("token_quote_amount", "numeric", col => col.notNull())
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .addColumn("updated_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .addColumn("emitted_at", "timestamp")
        .execute()

    await db.schema
        .withSchema("collector")
        .createIndex("collector_raydium_v4_pool_address_idx")
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
