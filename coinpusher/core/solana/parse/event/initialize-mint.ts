import { pumpMintAuthorityAddress, tokenProgramAddress } from "../../constant"
import type { TransactionInstruction, Transaction } from "../transaction"

const initializeMintInstructionType = "initializeMint"
const initializeMint2InstructionType = "initializeMint2"

export type InitializeMintEvent = {
    transactionSignature: string
    hasFreezeAuthority: boolean
    hasMintAuthority: boolean
    eventType: "initializeMint"
    decimals: number
    mintAddress: string,
    fromPump: boolean
}

export class InitializeMintEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : InitializeMintEvent | null {
        if(params.instruction.payloadType !== "parsed") {
            return null
        }

        if(params.instruction.programID !== tokenProgramAddress.toBase58()) {
            return null
        }

        // If the mint has no decimals, it's probably an NFT.
        if(params.instruction.payload.value.decimals === 0) {
            return null
        }

        if(params.instruction.payload.type !== initializeMintInstructionType && params.instruction.payload.type !== initializeMint2InstructionType) {
            return null
        }

        return {
            eventType: "initializeMint",
            hasFreezeAuthority: !!params.instruction.payload.value.freezeAuthority,
            hasMintAuthority: !!params.instruction.payload.value.mintAuthority,
            transactionSignature: params.transaction.signature,
            decimals: params.instruction.payload.value.decimals,
            fromPump: params.instruction.payload.value.mintAuthority === pumpMintAuthorityAddress,
            mintAddress: params.instruction.payload.value.mint
        }
    }
}