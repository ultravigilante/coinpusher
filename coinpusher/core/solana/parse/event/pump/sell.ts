import { decode } from "bs58"
import type { TransactionInstruction, Transaction } from "../../transaction"
import { pumpProgramAddress, tokenProgramAddress } from "../../../constant"

export type PumpSellEvent = {
    transactionSignature: string,
    eventType: "pumpSell",
    tokenMint: string,
    tokenAmount: bigint,
    solAmount: bigint,
}

const sellInstructionID : Buffer = Buffer.from("33e685a4017f83ad", "hex")
const tokenMintAddressAccountIndex = 2
const userAccountIndex = 6
const pumpFeeDivisor = 100

export class PumpSellParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : PumpSellEvent | null {
        if(params.instruction.programID !== pumpProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payloadType !== "raw") {
            return null
        }

        const decoded = Buffer.from(decode(params.instruction.payload.value))
        if(!decoded.subarray(0, 8).equals(sellInstructionID)) {
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

            if(innerInstruction.programID !== tokenProgramAddress.toBase58()) {
                continue
            }

            for(const innerInstruction of params.instruction.instructions) {
                if(innerInstruction.programID === tokenProgramAddress.toBase58()) {
                    if(innerInstruction.payloadType !== "parsed") {
                        continue
                    }
                    if(innerInstruction.payload.type === "transfer") {
                        const parsed = innerInstruction.payload.value
                        if(parsed.authority === accounts[userAccountIndex]) {
                            tokenAmount = BigInt(parsed.amount)
                        } 
                    }
                } else if(innerInstruction.programID === pumpProgramAddress.toBase58()) {
                    if(innerInstruction.payloadType !== "raw") {
                        continue
                    }
    
                    const innerData = Buffer.from(decode(innerInstruction.payload.value))
                    const totalSolAmount = Buffer.from(innerData.subarray(48, 56)).readBigUInt64LE()
                    const pumpFee = totalSolAmount / BigInt(pumpFeeDivisor)
                    solanaAmount = totalSolAmount - pumpFee
                }
            }

        }

        if(!tokenAmount || !solanaAmount) {
            return null
        }

        return {
            transactionSignature: params.transaction.signature,
            eventType: "pumpSell",
            tokenMint: mintAddress,
            tokenAmount: tokenAmount,
            solAmount: solanaAmount,
        }

    }
}