import { decode } from "bs58"
import { raydiumCPProgramAddress, tokenProgramAddress } from "../../../constant"
import type { TransactionInstruction, Transaction } from "../../transaction"

export type RaydiumCPInitializeEvent = {
    transactionSignature: string
    eventType: "raydiumCPInitialize",
    poolAddress: string
    token0MintAddress: string
    token0VaultAddress: string
    token1MintAddress: string
    token1VaultAddress: string
    token0Amount: string
    token1Amount: string
    liquidityTokenMintAddress: string
}

const initializeInstructionID : Buffer = Buffer.from("afaf6d1f0d989bed", "hex")
const token0MintAccountIndex = 4
const token1MintAccountIndex = 5
const lpMintAccountIndex = 6
const poolStateAccountIndex = 3
const token0PoolVaultAccountIndex = 10
const token1PoolVaultAccountIndex = 11

export class RaydiumCPInitializeEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : RaydiumCPInitializeEvent | null {
        if(params.instruction.programID !== raydiumCPProgramAddress.toBase58()) {
            return null
        }

        if(params.instruction.payloadType !== "raw") {
            return null
        }

        const decoded = Buffer.from(decode(params.instruction.payload.value))
        if(!decoded.subarray(0, 8).equals(initializeInstructionID)) {
            return null
        }

        const accounts = params.instruction.payload.accounts
        const pool0VaultAddress = accounts[token0PoolVaultAccountIndex]
        const pool1VaultAddress = accounts[token1PoolVaultAccountIndex]
        const lpMintAddress = accounts[lpMintAccountIndex]

        let token0Amount : string | null = null
        let token1Amount : string | null = null

        for(const innerInstruction of params.instruction.instructions) {
            if(innerInstruction.payloadType !== "parsed") {
                continue
            }

            if(innerInstruction.programID !== tokenProgramAddress.toBase58()) {
                continue
            }

            if(innerInstruction.payload.type === "transferChecked") {
                const parsed = innerInstruction.payload.value
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
            eventType: "raydiumCPInitialize",
            poolAddress: accounts[poolStateAccountIndex],
            token0MintAddress: accounts[token0MintAccountIndex],
            token1MintAddress: accounts[token1MintAccountIndex],
            token0VaultAddress: pool0VaultAddress,
            token1VaultAddress: pool1VaultAddress,
            token0Amount,
            token1Amount,
            liquidityTokenMintAddress: lpMintAddress,
        }
    }
}