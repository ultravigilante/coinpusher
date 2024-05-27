import { sql, type Kysely } from "kysely";

export const up = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("collector")
        .createTable("spl_token")
        .addColumn("id", "serial", col => col.primaryKey())
        .addColumn("mint_address", "text", col => col.notNull())
        .addColumn("decimals", "integer", col => col.notNull())
        .addColumn("minted_amount", "numeric", col => col.notNull())
        .addColumn("burnt_amount", "numeric", col => col.notNull())
        .addColumn("has_mint_authority", "boolean", col => col.notNull())
        .addColumn("has_freeze_authority", "boolean", col => col.notNull())
        .addColumn("is_from_pump", "boolean", col => col.notNull())
        .addColumn("created_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .addColumn("updated_at", "timestamp", col => col.notNull().defaultTo(sql`now()`))
        .addColumn("emitted_at", "timestamp")
        .execute()

    await db.schema
        .withSchema("collector")
        .createIndex("collector_spl_token_mint_address_idx")
        .on("spl_token")
        .column("mint_address")
        .unique()
        .execute()
}

export const down = async (db : Kysely<any>) => {
    await db.schema
        .withSchema("collector")
        .dropTable("spl_token")
        .execute()
}
