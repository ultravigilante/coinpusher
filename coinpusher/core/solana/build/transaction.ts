import { Transaction, type TransactionInstruction } from "@solana/web3.js"
import { heliusRPCURL, walletKeyPair } from "../constant"

export class TransactionBuilder {

    async build(instructions : TransactionInstruction[]) : Promise<Transaction> {
        const transaction = new Transaction()
        const recentBlockHash = await heliusRPCURL.getLatestBlockhash()
        transaction.recentBlockhash = recentBlockHash.blockhash
        transaction.lastValidBlockHeight = recentBlockHash.lastValidBlockHeight
        transaction.feePayer = walletKeyPair.publicKey
        transaction.add(...instructions)
        transaction.sign(walletKeyPair)
        return transaction
    }

}