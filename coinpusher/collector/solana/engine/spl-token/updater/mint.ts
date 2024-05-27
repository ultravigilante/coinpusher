import { sql } from "kysely"
import { Logger } from "@coinpusher/core/logging"
import type { MintEvent } from "@coinpusher/core/solana/parse/event/mint"
import type { TransactionEvent } from "@coinpusher/core/solana/parse"
import { database } from "@coinpusher/core/database"

export class MintEventUpdater {
    private logger: Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async update(events: TransactionEvent[]) {
        const mintEvents : MintEvent[] = []
        const dedupedMintAddresses : Set<string> = new Set()
        for(const event of events) {
            if(event.eventType === "mint") {
                dedupedMintAddresses.add(event.mintAddress)
                mintEvents.push(event)
            }
        }

        if(mintEvents.length === 0) {
            return
        }

        const trackedMintAddresses : Set<string> = new Set()
        const matchingMintAddresses = await database
                .selectFrom("collector.spl_token")
                .where("mint_address", "in", Array.from(dedupedMintAddresses))
                .select(["mint_address"])
                .execute()
        for(const row of matchingMintAddresses) {
            trackedMintAddresses.add(row.mint_address)
        }

        for(const event of mintEvents) {
            if(!trackedMintAddresses.has(event.mintAddress)) {
                continue
            }

            this.logger.debug(`Received event: ${event.eventType}. Minting token: ${event.mintAddress} (transaction: ${event.transactionSignature})`)
            await database
                .updateTable("collector.spl_token")
                .set(eb => ({ 
                    minted_amount: eb("minted_amount", "+", event.amount),
                    updated_at: sql<Date>`now()`
                }))
                .where("mint_address", "=", event.mintAddress)
                .execute()
        }
    }
}