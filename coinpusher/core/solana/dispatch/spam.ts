import { Interval } from "@coinpusher/core/interval"
import { Transaction, type Connection, type Keypair } from "@solana/web3.js"
import { TransactionVerifier } from "./common"
import { encode } from "bs58"
import { heliusRPCURL } from "../constant"
import { Semaphore } from "@coinpusher/core/semaphore"

const spamIntervalMs = 100
const globalSemaphore = new Semaphore(1)

export class SpamTransactionDispatcher {

    private verifier : TransactionVerifier

    constructor() {
        this.verifier = new TransactionVerifier()
    }

    async dispatch(transaction : Transaction) {
        try {
            if(!transaction.signature) {
                throw new Error("Transaction must be signed")
            }
            if(!transaction.lastValidBlockHeight) {
                throw new Error("Transaction must have a last valid block height")
            }

            await globalSemaphore.acquire()
            const signature = encode(transaction.signature)
            const lastValidBlockHeight = transaction.lastValidBlockHeight

            const spamCycler = new Interval({
                repeatIntervalMs: spamIntervalMs,
                repeatFn: async () => {
                    await heliusRPCURL.sendRawTransaction(
                        transaction.serialize(),
                        { skipPreflight: true, maxRetries: 0}
                    )
                }
            })
            try {
                return await this.verifier.verify({ signature, lastValidBlockHeight })
            } finally {
                await spamCycler.stop()
            }
        } finally {
            globalSemaphore.release()
        }
    }
}