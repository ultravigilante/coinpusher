import { Channel, type UnsubscribeFn } from "@coinpusher/core/channel";
import { ZeroLatch } from "@coinpusher/core/latch";
import { WebSocket } from "ws";
import { Semaphore } from "@coinpusher/core/semaphore";
import { SPLTokenEngine, type SPLTokenCollectedEvent } from "./engine/spl-token";
import { RaydiumV4Engine, type RaydiumV4CollectedEvent } from "./engine/raydium-v4";
import { TransactionEventParser, type TransactionEvent as TransactionEvent } from "@coinpusher/core/solana/parse";
import env from "@coinpusher/env";
import { tokenProgramAddress } from "@coinpusher/core/solana/constant";
import { z } from "zod";
import { safeParseJSON } from "@coinpusher/core/json";
import { broadcaster } from "@coinpusher/broadcast";

export type CollectorEvent =
    SPLTokenCollectedEvent |
    RaydiumV4CollectedEvent

interface Engine {
    processEvents(events : TransactionEvent[]): Promise<CollectorEvent[]>
}

const heliusSocketURL = `wss://atlas-mainnet.helius-rpc.com?api-key=${env.core.solana.heliusAPIKey}`

const WebSocketMessageDataSchema = z.object({
    params: z.object({
        result : z.object({
            transaction: z.any()
        })
    })
})

const openMessage = {
    jsonrpc: "2.0",
    id: 420,
    method: "transactionSubscribe",
    params: [{
        failed: false,
        accountInclude: [tokenProgramAddress]
    }, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
        encoding: "jsonParsed",
        transactionDetails: "full"
    }]
}

export class Collector {

    private latch : ZeroLatch
    private semaphore : Semaphore
    private eventBatch : TransactionEvent[]
    private engines : Engine[]
    private shouldStop : boolean
    private transactionEventParser : TransactionEventParser
    private socket : WebSocket

    constructor() {
        this.transactionEventParser = new TransactionEventParser()
        this.shouldStop = false
        this.latch = new ZeroLatch(1)
        this.semaphore = new Semaphore(1)
        this.eventBatch = []
        this.engines = [
            new SPLTokenEngine(),
            new RaydiumV4Engine()
        ]

        this.socket = new WebSocket(heliusSocketURL)

        this.socket.on("open", () => this.onOpen(this.socket))
        this.socket.on("message", (data: Buffer) => this.onMessage(data))
        this.socket.on("close", () => this.onClose())
    }

    private onOpen(socket : WebSocket) {
        socket.send(JSON.stringify(openMessage))
    }

    private onClose() {
        if(!this.shouldStop) {
            throw new Error("Socket closed unexpectedly!")
        }
        this.latch.decrement()
    }

    private async onMessage(data : Buffer) {
        this.latch.increment()
        await this.semaphore.acquire()
        try {
            const structuredData = safeParseJSON(data.toString("utf8"))
            if(!structuredData) {
                return
            }

            const parsedMessage = WebSocketMessageDataSchema.safeParse(structuredData)
            if(!parsedMessage.success) {
                return
            }

            const events = this.transactionEventParser.parse(parsedMessage.data.params.result.transaction)
            for(const event of events) {
                this.onTransactionEvent(event)
            }
        } finally {
            this.semaphore.release()
            this.latch.decrement()
        }
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
                    broadcaster.publish(event)        
                }
            }

            this.eventBatch = []
        } finally {
            this.semaphore.release()
            this.latch.decrement()
        }
    }

    async stop() {
        this.shouldStop = true
        this.socket.close()
        await this.latch.join()
    }

}