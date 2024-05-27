import { Channel, type UnsubscribeFn } from "@coinpusher/core/channel";
import { ZeroLatch } from "@coinpusher/core/latch";
import { Semaphore } from "@coinpusher/core/semaphore";
import { SPLTokenEngine, type SPLTokenCollectedEvent } from "./engine/spl-token";
import { RaydiumV4Engine, type RaydiumV4CollectedEvent } from "./engine/raydium-v4";
import type { TransactionEvent as TransactionEvent } from "@coinpusher/core/solana/parse";
import { transactionEventChannel } from "@coinpusher/origin/solana";
import env from "@coinpusher/env";

export type CollectorEvent =
    SPLTokenCollectedEvent |
    RaydiumV4CollectedEvent

interface Engine {
    processEvents(events : TransactionEvent[]): Promise<CollectorEvent[]>
}

export const collectorEventChannel = new Channel<CollectorEvent>()

export class Collector {

    private unsubscribeFn : UnsubscribeFn
    private latch : ZeroLatch
    private semaphore : Semaphore
    private eventBatch : TransactionEvent[]
    private engines : Engine[]

    constructor() {
        this.latch = new ZeroLatch()
        this.semaphore = new Semaphore(1)
        this.eventBatch = []
        this.engines = [
            new SPLTokenEngine(),
            new RaydiumV4Engine()
        ]

        this.unsubscribeFn = transactionEventChannel.subscribe(
            (ev) => {
                this.latch.increment()
                this.onTransactionEvent(ev)
            }
        )
    }

    private async onTransactionEvent(ev : TransactionEvent) {
        try {
            await this.semaphore.acquire()
            this.eventBatch.push(ev)
            if(this.eventBatch.length < env.collector.solana.eventBatchSize) {
                return
            }

            for(const engine of this.engines) {
                for(const event of await engine.processEvents(this.eventBatch)) {
                    collectorEventChannel.publish(event)        
                }
            }

            this.eventBatch = []
        } finally {
            this.semaphore.release()
            this.latch.decrement()
        }
    }

    async stop() {
        this.unsubscribeFn()
        await this.latch.join()
    }

}