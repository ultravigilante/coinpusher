import { tokenProgramAddress } from "../../constant"
import type { TransactionInstruction, Transaction } from "../transaction"

export type MintEvent = {
    transactionSignature: string
    eventType: "mint"
    mintAddress: string
    amount: string
}

export class MintEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : MintEvent | null {
        if(params.instruction.payloadType !== "parsed") {
            return null
        }

        if(params.instruction.programID !== tokenProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payload.type !== "mintTo") {
            return null
        }

        return {
            eventType: "mint",
            transactionSignature: params.transaction.signature,
            mintAddress: params.instruction.payload.value.mint,
            amount: params.instruction.payload.value.amount
        }
    }
}