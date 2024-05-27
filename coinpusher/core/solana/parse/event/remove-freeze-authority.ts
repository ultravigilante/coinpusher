import { tokenProgramAddress } from "../../constant"
import type { TransactionInstruction, Transaction } from "../transaction"

export type RemoveFreezeAuthorityEvent = {
    transactionSignature: string
    eventType: "removeFreezeAuthority"
    mintAddress: string
}

const setAuthorityInstructionType = "setAuthority"
const authorityType = "freezeAccount"

export class RemoveFreezeAuthorityEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : RemoveFreezeAuthorityEvent | null {
        if(params.instruction.payloadType !== "parsed") {
            return null
        }

        if(params.instruction.programID !== tokenProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payload.type !== setAuthorityInstructionType) {
            return null
        }

        if(params.instruction.payload.value.authorityType !== authorityType) {
            return null
        }

        if(params.instruction.payload.value.newAuthority !== null) {
            return null
        }

        return {
            eventType: "removeFreezeAuthority",
            transactionSignature: params.transaction.signature,
            mintAddress: params.instruction.payload.value.mint
        }
    }
}