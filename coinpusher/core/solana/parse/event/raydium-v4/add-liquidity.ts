import { decode } from "bs58";
import type { TransactionInstruction, Transaction } from "../../transaction"
import { raydiumV4ProgramAddress, tokenProgramAddress } from "../../../constant";

export type RaydiumV4AddLiquidityEvent = {
    transactionSignature: string
    eventType: "raydiumV4AddLiquidity"
    poolAddress: string
    baseAmount: string
    quoteAmount: string
}

const addLiquidityInstructionID = 3
const poolAccountIndex = 1
const poolBaseAccountIndex = 6
const poolQuoteAccountIndex = 7

export class RaydiumV4AddLiquidityEventParser {
    parse (params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : RaydiumV4AddLiquidityEvent | null {
        if(params.instruction.programID !== raydiumV4ProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payloadType !== "raw") {
            return null
        }

        const instructionData = decode(params.instruction.payload.value)
        if(instructionData[0] !== addLiquidityInstructionID) {
            return null
        }

        const poolBaseAddress = params.instruction.payload.accounts[poolBaseAccountIndex]
        const poolQuoteAddress = params.instruction.payload.accounts[poolQuoteAccountIndex]

        let baseAmount : string | null = null
        let quoteAmount : string | null = null

        for(const innerInstruction of params.instruction.instructions) {
            if(innerInstruction.payloadType !== "parsed") {
                continue
            }

            if(innerInstruction.programID !== tokenProgramAddress.toBase58()) {
                continue
            }

            const parsed = innerInstruction.payload.value
            if(innerInstruction.payload.type === "transfer") {
                if(parsed.destination === poolBaseAddress) {
                    baseAmount = parsed.amount
                } else if(parsed.destination === poolQuoteAddress) {
                    quoteAmount = parsed.amount
                }
            }
        }

        if(baseAmount === null || quoteAmount === null) {
            return null
        }

        return {
            eventType: "raydiumV4AddLiquidity",
            transactionSignature: params.transaction.signature,
            poolAddress: params.instruction.payload.accounts[poolAccountIndex],
            baseAmount: baseAmount,
            quoteAmount: quoteAmount,
        }
    }
}