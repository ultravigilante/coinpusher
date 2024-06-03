import { Logger } from "@coinpusher/core/logging"
import type { Transaction } from "@solana/web3.js"
import axios from "axios"
import { encode } from "bs58"

const jitoURL = "https://mainnet.block-engine.jito.wtf/api/v1/bundles"
const jitoHeaders = { "Accept-Encoding": "gzip" }

export class JitoTransactionDispatcherEngine {
    private logger : Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async dispatch(transaction : Transaction) {
        this.logger.debug(`Sending transaction to RPC: ${transaction}`)
        await axios.post(jitoURL, {
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [[encode(transaction.serialize())]]
        }, { headers : jitoHeaders }).catch((err) => {
            this.logger.error(`Request failed: ${err}`)
        })
    }
}