import { sql } from "kysely"
import { Logger } from "@coinpusher/core/logging"
import type { TransactionEvent } from "@coinpusher/core/solana/parse"
import { database } from "@coinpusher/core/database"

export class RaydiumV4InitializeEventUpdater {
    private logger : Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async update(events: TransactionEvent[]) {
        for(const event of events) {
            if(event.eventType != "raydiumV4Initialize") {
                continue
            }

            this.logger.debug(`Received event: ${event.eventType}. Initializing pool: ${event.poolAddress} (transaction: ${event.transactionSignature})`)
            await database.insertInto("collector.raydium_v4")
                .values({
                    pool_address: event.poolAddress,
                    token_base_mint_address: event.baseMintAddress,
                    token_quote_mint_address: event.quoteMintAddress,
                    liquidity_token_mint_address: event.liquidityTokenMintAddress,
                    token_base_vault_address: event.tokenBaseVaultAddress,
                    token_quote_vault_address: event.tokenQuoteVaultAddress,
                    token_base_added_amount: event.baseAmount.toString(),
                    token_quote_added_amount: event.quoteAmount.toString(),
                    token_base_removed_amount: 0,
                    token_quote_removed_amount: 0,
                    token_base_amount: event.baseAmount.toString(),
                    token_quote_amount: event.quoteAmount.toString(),
                    updated_at: sql<Date>`now()`
                })
                .execute()
        }
    }
}
