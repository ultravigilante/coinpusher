import base58 from "bs58"
import type { TransactionInstruction, Transaction } from "../../transaction"
import { raydiumV4ProgramAddress, raydiumV4AuthorityAddress, tokenProgramAddress } from "../../../constant"

export type RaydiumV4InitializeEvent = {
    transactionSignature: string
    eventType: "raydiumV4Initialize"
    poolAddress: string
    tokenBaseVaultAddress: string
    tokenQuoteVaultAddress: string
    baseMintAddress: string
    quoteMintAddress: string
    baseAmount: bigint
    quoteAmount: bigint
    liquidityTokenMintAddress: string
}

type CapturedAmount = { mint: string, amount : string }

const initializeInstructionID = 1
const poolAccountIndex = 4
const poolBaseAccountIndex = 10
const poolQuoteAccountIndex = 11

export class RaydiumV4InitializeEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : RaydiumV4InitializeEvent | null {
        if(params.instruction.programID !== raydiumV4ProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payloadType !== "raw") {
            return null
        }

        const instructionData = base58.decode(params.instruction.payload.value)
        if(instructionData[0] !== initializeInstructionID) {
            return null
        }

        const poolBaseAddress = params.instruction.payload.accounts[poolBaseAccountIndex]
        const poolQuoteAddress = params.instruction.payload.accounts[poolQuoteAccountIndex]

        let baseCapture : CapturedAmount | null = null
        let quoteCapture : CapturedAmount | null = null
        let liquidityMint : string | null = null

        for(const innerInstruction of params.instruction.instructions) {
            if(innerInstruction.payloadType !== "parsed") {
                continue
            }

            if(innerInstruction.programID !== tokenProgramAddress.toBase58()) {
                continue
            }

            const parsed = innerInstruction.payload.value
            if(innerInstruction.payload.type === "transfer") {
                const balance = params.transaction.balances.find(b => b.account === parsed.destination)
                if(!balance) {
                    return null
                }

                if(parsed.destination === poolBaseAddress) {
                    baseCapture = { mint: balance.mint, amount: balance.amount }
                } else if(parsed.destination === poolQuoteAddress) {
                    quoteCapture = { mint: balance.mint, amount: balance.amount }
                }
            } else if(innerInstruction.payload.type === "mintTo") {
                if(parsed.mintAuthority === raydiumV4AuthorityAddress) {
                    liquidityMint = parsed.mint
                }
            }
        }

        if(baseCapture === null || quoteCapture === null || liquidityMint === null) {
            return null
        }

        return {
            eventType: "raydiumV4Initialize",
            transactionSignature: params.transaction.signature,
            poolAddress: params.instruction.payload.accounts[poolAccountIndex],
            baseMintAddress: baseCapture.mint,
            baseAmount: BigInt(baseCapture.amount),
            quoteMintAddress: quoteCapture.mint,
            quoteAmount: BigInt(quoteCapture.amount),
            tokenBaseVaultAddress: poolBaseAddress,
            tokenQuoteVaultAddress: poolQuoteAddress,
            liquidityTokenMintAddress: liquidityMint
        }

    }
}