import { Channel } from "@coinpusher/core/channel"
import { safeParseJSON } from "@coinpusher/core/json"
import { ZeroLatch } from "@coinpusher/core/latch"
import { tokenProgramAddress } from "@coinpusher/core/solana/constant"
import { TransactionEventParser, type TransactionEvent } from "@coinpusher/core/solana/parse"
import env from "@coinpusher/env"
import { z } from "zod"
import { WebSocket } from "ws"

const heliusSocketURL = `wss://atlas-mainnet.helius-rpc.com?api-key=${env.core.solana.heliusAPIKey}`

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

const WebSocketMessageDataSchema = z.object({
    params: z.object({
        result : z.object({
            transaction: z.any()
        })
    })
})

export const transactionEventChannel = new Channel<TransactionEvent>()

export class Origin {
    private socket : WebSocket
    private transactionEventParser : TransactionEventParser
    private shouldStop : boolean
    private latch : ZeroLatch

    constructor() {
        this.transactionEventParser = new TransactionEventParser()
        this.shouldStop = false
        this.latch = new ZeroLatch(1)
        this.socket = new WebSocket(heliusSocketURL)
        this.socket.on("open", () => {
            this.onOpen(this.socket)
        })
        this.socket.on("message", (data: Buffer) => this.onMessage(data))
        this.socket.on("close", () => {
            if(!this.shouldStop) {
                throw new Error("Socket closed unexpectedly!")
            }
            this.latch.decrement()
        })
    }

    private onOpen(socket : WebSocket) {
        socket.send(JSON.stringify(openMessage))
    }

    private async onMessage(data : Buffer) {
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
            transactionEventChannel.publish(event)
        }
    }

    async stop() {
        this.shouldStop = true
        this.socket.close()
        await this.latch.join()
    }
}
