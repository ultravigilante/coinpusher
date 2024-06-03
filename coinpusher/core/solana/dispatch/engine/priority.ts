import { Transaction} from "@solana/web3.js"
import { heliusRPCURL } from "../../constant"
import { Logger } from "@coinpusher/core/logging"

export class PriorityTransactionDispatcherEngine {

    private logger : Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async dispatch(transaction : Transaction) {
        this.logger.debug(`Sending transaction to RPC: ${transaction}`)
        await heliusRPCURL.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: true, maxRetries: 0}
        )
    }
}