import { RaydiumV4AddLiquidityEventUpdater } from "./updater/add-liquidity";
import { RaydiumV4RemoveLiquidityEventUpdater } from "./updater/remove-liquidity";
import { RaydiumV4InitializeEventUpdater } from "./updater/initialize";
import type { TransactionEvent } from "@coinpusher/core/solana/parse";
import { sql } from "kysely";
import { database } from "@coinpusher/core/database";

interface Updater {
    update(events : TransactionEvent[]): Promise<void>
}

export type RaydiumV4CollectedEvent = {
    eventType: "RaydiumV4"
    poolAddress: string
}

export class RaydiumV4Engine {

    private updaters : Updater[]

    constructor() {
        this.updaters = [
            new RaydiumV4InitializeEventUpdater(),
            new RaydiumV4AddLiquidityEventUpdater(),
            new RaydiumV4RemoveLiquidityEventUpdater()
        ]
    }

    async processEvents(events: TransactionEvent[]) : Promise<RaydiumV4CollectedEvent[]> {
        for(const reducer of this.updaters) {
            await reducer.update(events)
        }

        const rows = await database
            .updateTable("collector.raydium_v4")
            .set({ updated_at: sql`now()` })
            .whereRef("updated_at", "<", "emitted_at")
            .returning("pool_address")
            .execute()

        return rows.map(row => ({ 
            poolAddress: row.pool_address,
            eventType: "RaydiumV4"
        }))
    }

}