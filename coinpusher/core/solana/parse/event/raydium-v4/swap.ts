import { decode } from "bs58";
import type { TransactionInstruction, Transaction } from "../../transaction"
import { raydiumV4ProgramAddress, tokenProgramAddress } from "@coinpusher/core/solana/constant";

export type RaydiumV4SwapEvent = {
    transactionSignature: string
    eventType: "raydiumV4Swap"
    poolAddress: string
    baseAmount: bigint
    quoteAmount: bigint
    basePostBalance: bigint
    quotePostBalance: bigint
}

const swapInstructionID = 9
const poolAccountIndex = 1
const poolBaseAccountIndex = 5
const poolQuoteAccountIndex = 6

export class RaydiumV4SwapEventParser {
    parse (params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : RaydiumV4SwapEvent | null {
        if(params.instruction.programID !== raydiumV4ProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payloadType !== "raw") {
            return null
        }

        const instructionData = decode(params.instruction.payload.value)
        if(instructionData[0] !== swapInstructionID) {
            return null
        }

        const accounts = params.instruction.payload.accounts
        let adjustedPoolBaseAccountIndex = poolBaseAccountIndex
        let adjustedPoolQuoteAccountIndex = poolQuoteAccountIndex
        if(accounts.length <= 17) {
            adjustedPoolBaseAccountIndex -= 1
            adjustedPoolQuoteAccountIndex -= 1
        }

        const poolBaseAddress = params.instruction.payload.accounts[adjustedPoolBaseAccountIndex]
        const poolQuoteAddress = params.instruction.payload.accounts[adjustedPoolQuoteAccountIndex]

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
                if(parsed.source === poolBaseAddress) {
                    baseAmount = parsed.amount
                } else if(parsed.source === poolQuoteAddress) {
                    quoteAmount = parsed.amount
                }
            }
        }

        if(!baseAmount || !quoteAmount) {
            return null
        }

        let baseBalance : string | null = null
        let quoteBalance : string | null = null
        for(const balance of params.transaction.balances) {
            if(balance.account === poolBaseAddress) {
                baseBalance = balance.amount
            } else if(balance.account === poolQuoteAddress) {
                quoteBalance = balance.amount
            }
        }
        if(baseBalance === null || quoteBalance === null) {
            return null
        }

        return {
            eventType: "raydiumV4Swap",
            transactionSignature: params.transaction.signature,
            poolAddress: params.instruction.payload.accounts[poolAccountIndex],
            basePostBalance: BigInt(baseBalance),
            baseAmount: BigInt(baseAmount),
            quotePostBalance: BigInt(quoteBalance),
            quoteAmount: BigInt(quoteAmount),
        }
    }
}