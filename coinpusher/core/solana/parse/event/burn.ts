import { tokenProgramAddress } from "../../constant"
import type { TransactionInstruction, Transaction } from "../transaction"

export type BurnEvent = {
    transactionSignature: string
    eventType: "burn"
    amount: string
    mintAddress: string
}

const burnInstructionType = "burn"
const burnCheckedInstructionType = "burnChecked"

export class BurnEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : BurnEvent | null {
        if(params.instruction.payloadType !== "parsed") {
            return null
        }

        if(params.instruction.programID !== tokenProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payload.type !== burnInstructionType && params.instruction.payload.type !== burnCheckedInstructionType) {
            return null
        }

        return {
            eventType: "burn",
            transactionSignature: params.transaction.signature,
            mintAddress: params.instruction.payload.value.mint,
            amount: params.instruction.payload.type === burnInstructionType
                ? params.instruction.payload.value.amount 
                : params.instruction.payload.value.tokenAmount.amount
        }
    }
}