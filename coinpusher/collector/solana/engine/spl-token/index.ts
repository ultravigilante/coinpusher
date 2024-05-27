import { database } from "@coinpusher/core/database";
import { BurnEventUpdater } from "./updater/burn";
import { InitializeMintEventUpdater } from "./updater/initialize-mint";
import { MintEventUpdater } from "./updater/mint";
import { RemoveFreezeAuthorityEventUpdater } from "./updater/remove-freeze-authority";
import { RemoveMintAuthorityEventUpdater } from "./updater/remove-mint-authority";
import type { TransactionEvent } from "@coinpusher/core/solana/parse";
import { sql } from "kysely";

interface Updater {
    update(events : TransactionEvent[]): Promise<void>
}

export type SPLTokenCollectedEvent = {
    eventType: "SPLToken"
    mintAddress: string
}

export class SPLTokenEngine {

    private updaters : Updater[]

    constructor() {
        this.updaters = [
            new InitializeMintEventUpdater(),
            new MintEventUpdater(),
            new BurnEventUpdater(),
            new RemoveMintAuthorityEventUpdater(),
            new RemoveFreezeAuthorityEventUpdater(),
        ]
    }

    async processEvents(events: TransactionEvent[]) : Promise<SPLTokenCollectedEvent[]> {
        for(const updater of this.updaters) {
            await updater.update(events)
        }

        const rows = await database
            .updateTable("collector.spl_token")
            .set({ updated_at: sql`now()` })
            .whereRef("updated_at", "<", "emitted_at")
            .returning("mint_address")
            .execute()

        return rows.map(row => ({ 
            mintAddress: row.mint_address,
            eventType: "SPLToken"
        }))
    }

}