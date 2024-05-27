import { sql } from "kysely"
import { database } from "@coinpusher/core/database"
import { Logger } from "@coinpusher/core/logging"
import type { TransactionEvent } from "@coinpusher/core/solana/parse"

export class RemoveMintAuthorityEventUpdater {
    private logger: Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async update(events: TransactionEvent[]) {
        for(const event of events) {
            if(event.eventType != "removeMintAuthority") {
                continue
            }

            this.logger.debug(`Received event: ${event.eventType}. Removing mint authority from: ${event.mintAddress} (transaction: ${event.transactionSignature})`)
            await database.updateTable("collector.spl_token")
                .set({ 
                    has_mint_authority: false,
                    updated_at: sql<Date>`now()`
                })
                .where("mint_address", "=", event.mintAddress)
                .returning("mint_address")
                .execute()
        }
    }
}
