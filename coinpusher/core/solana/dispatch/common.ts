import { Interval } from "@coinpusher/core/interval"
import { Logger } from "@coinpusher/core/logging"
import type { ParsedTransactionWithMeta } from "@solana/web3.js"
import { heliusRPCURL } from "../constant"

const pollIntervalMs = 2_500

export class TransactionVerifier {

    private logger : Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async verify(params : {
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