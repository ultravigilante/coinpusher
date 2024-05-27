import type { Transaction } from "@solana/web3.js"
import { TransactionVerifier } from "./common"
import axios from "axios"
import { encode } from "bs58"

const jitoURL = "https://mainnet.block-engine.jito.wtf/api/v1/bundles"
const jitoHeaders = { "Accept-Encoding": "gzip" }

export class JitoTransactionDispatcher {

    private verifier : TransactionVerifier

    constructor() {
        this.verifier = new TransactionVerifier()
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

        await axios.post(jitoURL, {
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [[encode(transaction.serialize())]]
        }, { headers : jitoHeaders }).catch(() => null)

        return await this.verifier.verify({ signature, lastValidBlockHeight })
    }
}