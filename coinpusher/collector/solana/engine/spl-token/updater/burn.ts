import { sql } from "kysely";
import { database } from "@coinpusher/core/database";
import { Logger } from "@coinpusher/core/logging";
import type { BurnEvent } from "@coinpusher/core/solana/parse/event/burn";
import type { TransactionEvent } from "@coinpusher/core/solana/parse";

export class BurnEventUpdater {

    private logger : Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async update(events : TransactionEvent[]) {
        const burnEvents : BurnEvent[] = []
        const dedupedMintAddresses : Set<string> = new Set()
        for(const event of events) {
            if(event.eventType === "burn") {
                dedupedMintAddresses.add(event.mintAddress)
                burnEvents.push(event)
            }
        }

        if(burnEvents.length === 0) {
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

        for(const event of burnEvents) {
            if(!trackedMintAddresses.has(event.mintAddress)) {
                continue
            }

            this.logger.debug(`Received event: ${event.eventType}. Burning token: ${event.mintAddress} (transaction: ${event.transactionSignature})`)
            await database
                .updateTable("collector.spl_token")
                .set(eb => ({ 
                    burnt_amount: eb("burnt_amount", "+", event.amount),
                    updated_at: sql<Date>`now()`
                }))
                .where("mint_address", "=", event.mintAddress)
                .execute()
        }
    }

}