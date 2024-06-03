import { Interval } from "@coinpusher/core/interval"
import { Logger } from "@coinpusher/core/logging"
import type { ParsedTransactionWithMeta, Transaction } from "@solana/web3.js"
import { heliusRPCURL } from "../constant"
import { encode } from "bs58"

interface Engine {
    dispatch(transaction : Transaction) : Promise<void>
}

const spamIntervalMs = 1000
const pollIntervalMs = 1000

export class TransactionDispatcher {

    private logger : Logger
    private engine : Engine

    constructor(params : { 
        engine : Engine
    }) {
        this.logger = new Logger({ path: __filename })
        this.engine = params.engine
    }

    async dispatch(transaction : Transaction) {
        if(!transaction.signature) {
            throw new Error("Transaction must be signed")
        }
        if(!transaction.lastValidBlockHeight) {
            throw new Error("Transaction must have a last valid block height")
        }

        const signature = encode(transaction.signature)
        const lastValidBlockHeight = transaction.lastValidBlockHeight
        const spamCycler = new Interval({
            repeatIntervalMs: spamIntervalMs,
            repeatFn: async () => {
                this.logger.debug(`Spamming transaction: ${signature}`)
                await this.engine.dispatch(transaction)
            }
        })

        try {
            return await this.verify({ signature, lastValidBlockHeight })
        } finally {
            await spamCycler.stop()
        }

    }

    private async verify(params : {
        signature: string,
        lastValidBlockHeight: number,
    }) : Promise<ParsedTransactionWithMeta | null> {
        let result : ParsedTransactionWithMeta | null = null
        this.logger.debug(`Polling for transaction: ${params.signature}`)
        const pollRepeater = new Interval({
            repeatIntervalMs: pollIntervalMs,
            repeatFn: async () => {
                const blockHeight = await heliusRPCURL.getBlockHeight()
                result = await heliusRPCURL.getParsedTransaction(params.signature, "confirmed")
                if(result) {
                    this.logger.debug(`Transaction found: ${params.signature}`)
                    pollRepeater.stop()
                } else if(blockHeight > params.lastValidBlockHeight) {
                    this.logger.debug(`Transaction was not found before block height exceeded: ${params.signature}`)
                    pollRepeater.stop()
                }
            }
        })

        await pollRepeater.join()
        return result
    }

}