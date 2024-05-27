import { sql } from "kysely"
import { database, type Database } from "@coinpusher/core/database"
import { Logger } from "@coinpusher/core/logging"
import type { TransactionEvent } from "@coinpusher/core/solana/parse"

export class RemoveFreezeAuthorityEventUpdater {
    private logger: Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async update(events: TransactionEvent[]) {
        const updatedMintAddresses : string[] = []
        for(const event of events) {
            if(event.eventType != "removeFreezeAuthority") {
                continue
            }

            this.logger.debug(`Received event: ${event.eventType}. Removing freeze authority from: ${event.mintAddress} (transaction: ${event.transactionSignature})`)
            const rows = await database.updateTable("collector.spl_token")
                .set({ 
                    has_freeze_authority: false,
                    updated_at: sql<Date>`now()`
                })
                .where("mint_address", "=", event.mintAddress)
                .returning("mint_address")
                .execute()
        }
    }
}
