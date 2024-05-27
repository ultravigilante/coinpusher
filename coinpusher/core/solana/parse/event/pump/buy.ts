import { decode } from "bs58"
import type { TransactionInstruction, Transaction } from "../../transaction"
import { pumpProgramAddress, systemProgramAddress, tokenProgramAddress } from "../../../constant"

export type PumpBuyEvent = {
    transactionSignature: string,
    eventType: "pumpBuy",
    tokenMint: string,
    tokenAmount: bigint,
    solAmount: bigint,
}

const buyInstructionID : Buffer = Buffer.from("66063d1201daebea", "hex")
const tokenMintAddressAccountIndex = 2
const userAccountIndex = 6
const bondingCurveAccountIndex = 3

export class PumpBuyParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : PumpBuyEvent | null {
        if(params.instruction.programID !== pumpProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payloadType !== "raw") {
            return null
        }

        const decoded = Buffer.from(decode(params.instruction.payload.value))
        if(!decoded.subarray(0, 8).equals(buyInstructionID)) {
            return null
        }

        const accounts = params.instruction.payload.accounts
        const mintAddress = accounts[tokenMintAddressAccountIndex]

        let tokenAmount : bigint | null = null
        let solanaAmount : bigint | null = null

        for(const innerInstruction of params.instruction.instructions) {
            if(innerInstruction.payloadType !== "parsed") {
                continue
            }

            if(innerInstruction.programID === tokenProgramAddress.toBase58()) {
                if(innerInstruction.payload.type === "transfer") {
                    const parsed = innerInstruction.payload.value
                    if(parsed.authority === accounts[bondingCurveAccountIndex]) {
                        tokenAmount = BigInt(parsed.amount)
                    } 
                }
            } else if(innerInstruction.programID === systemProgramAddress.toBase58()) {
                if(innerInstruction.payload.type === "transfer") {
                    const parsed = innerInstruction.payload.value
                    if(parsed.source === accounts[userAccountIndex] && parsed.destination === accounts[bondingCurveAccountIndex]) {
                        solanaAmount = BigInt(parsed.lamports)
                    } 
                }
            }
        }

        if(!tokenAmount || !solanaAmount) {
            return null
        }

        return {
            transactionSignature: params.transaction.signature,
            eventType: "pumpBuy",
            tokenMint: mintAddress,
            tokenAmount: tokenAmount,
            solAmount: solanaAmount,
        }

    }
}