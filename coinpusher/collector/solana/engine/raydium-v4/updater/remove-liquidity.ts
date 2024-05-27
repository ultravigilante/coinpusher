import { sql } from "kysely"
import { Logger } from "@coinpusher/core/logging"
import type { TransactionEvent } from "@coinpusher/core/solana/parse"
import { database } from "@coinpusher/core/database"

export class RaydiumV4RemoveLiquidityEventUpdater {
    private logger: Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async update(events: TransactionEvent[]) {
        for(const event of events) {
            if(event.eventType != "raydiumV4RemoveLiquidity") {
                continue
            }

            this.logger.debug(`Received event: ${event.eventType}. Remvoing liquidity to: ${event.poolAddress} (transaction: ${event.transactionSignature})`)
            await database.updateTable("collector.raydium_v4")
                .set(eb => ({
                    token_base_removed_amount: eb("token_base_removed_amount", "+", event.baseAmount),
                    token_quote_removed_amount: eb("token_quote_removed_amount", "+", event.quoteAmount),
                    updated_at: sql<Date>`now()`
                }))
                .where("pool_address", "=", event.poolAddress)
                .execute()
        }
    }
}
