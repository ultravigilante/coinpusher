import { tokenProgramAddress } from "../../constant"
import type { TransactionInstruction, Transaction } from "../transaction"

export type RemoveMintAuthorityEvent = {
    transactionSignature: string
    eventType: "removeMintAuthority"
    mintAddress: string
}

const setAuthorityInstructionType = "setAuthority"
const authorityType = "mintTokens"

export class RemoveMintAuthorityEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : RemoveMintAuthorityEvent | null {
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
            eventType: "removeMintAuthority",
            transactionSignature: params.transaction.signature,
            mintAddress: params.instruction.payload.value.mint
        }
    }
}