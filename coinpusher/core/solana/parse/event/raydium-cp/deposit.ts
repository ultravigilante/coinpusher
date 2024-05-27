import { decode } from "bs58"
import { raydiumCPProgramAddress, tokenProgramAddress } from "../../../constant"
import type { TransactionInstruction, Transaction } from "../../transaction"

export type RaydiumCPDepositEvent = {
    transactionSignature: string
    eventType: "raydiumCPDeposit",
    poolAddress: string
    token0Amount: string
    token1Amount: string
}

const depositInstructionID : Buffer = Buffer.from("f223c68952e1f2b6", "hex")
const poolStateAccountIndex = 3
const token0PoolVaultAccountIndex = 6
const token1PoolVaultAccountIndex = 7

export class RaydiumCPDepositEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : RaydiumCPDepositEvent | null {
        if(params.instruction.programID !== raydiumCPProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payloadType !== "raw") {
            return null
        }

        const decoded = Buffer.from(decode(params.instruction.payload.value))
        if(!decoded.subarray(0, 8).equals(depositInstructionID)) {
            return null
        }

        const accounts = params.instruction.payload.accounts
        const pool0VaultAddress = accounts[token0PoolVaultAccountIndex]
        const pool1VaultAddress = accounts[token1PoolVaultAccountIndex]

        let token0Amount : string | null = null
        let token1Amount : string | null = null

        for(const innerInstruction of params.instruction.instructions) {
            if(innerInstruction.payloadType !== "parsed") {
                continue
            }

            if(innerInstruction.programID !== tokenProgramAddress.toBase58()) {
                continue
            }

            const parsed = innerInstruction.payload.value
            if(innerInstruction.payload.type === "transferChecked") {
                if(parsed.destination === pool0VaultAddress) {
                    token0Amount = parsed.tokenAmount.amount
                } else if(parsed.destination === pool1VaultAddress) {
                    token1Amount = parsed.tokenAmount.amount
                } else {
                    continue
                }
            }
        }

        if(!token0Amount || !token1Amount) {
            return null
        }

        return {
            transactionSignature: params.transaction.signature,
            eventType: "raydiumCPDeposit",
            poolAddress: accounts[poolStateAccountIndex],
            token0Amount,
            token1Amount
        }
    }
}