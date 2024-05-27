import { raydiumV4ProgramAddress } from "@coinpusher/core/solana/constant";
import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import { z } from "zod";

const TransferParsedSchema = z.object({
    type: z.literal("transfer"),
    info: z.object({
        authority: z.string(),
        source: z.string(),
        destination: z.string(),
        amount: z.string(),
    })
})

export type SwapResult = {
    transactionSignature: string
    baseTransferAmount: bigint
    quoteTransferAmount: bigint
}

const baseVaultAccountAddressIndex = 5
const quoteVaultAccountAddressIndex = 6

export class SwapTransactionParser {

    parse(transaction: ParsedTransactionWithMeta) : SwapResult | null {
        const swapIndex = transaction.transaction.message.instructions.findIndex(instr => {
            return instr.programId.equals(raydiumV4ProgramAddress)
        })

        if(swapIndex === -1) {
            return null
        }

        const innerInstructions = transaction.meta?.innerInstructions?.find(innerInstruction => {
            return innerInstruction.index === swapIndex
        })?.instructions

        if(!innerInstructions) {
            return null
        }

        let baseAmount : bigint | null = null
        let quoteAmount : bigint | null = null

        for(const instr of innerInstructions) {
            if("parsed" in instr === false) {
                continue
            }

            const transferInstruction = TransferParsedSchema.safeParse(instr.parsed)
            if(!transferInstruction.success) {
                continue
            }

            const vaultIndex = [baseVaultAccountAddressIndex, quoteVaultAccountAddressIndex].find(ix => {
                const account = transaction.transaction.message.accountKeys[ix]
                return false
                    || account.pubkey.toBase58() === transferInstruction.data.info.source
                    || account.pubkey.toBase58() === transferInstruction.data.info.destination 
            })
                
            if(!vaultIndex) {
                continue
            } else if(vaultIndex === baseVaultAccountAddressIndex) {
                baseAmount = BigInt(transferInstruction.data.info.amount)
            } else if(vaultIndex === quoteVaultAccountAddressIndex) {
                quoteAmount = BigInt(transferInstruction.data.info.amount)
            }
        }

        if(baseAmount === null || quoteAmount === null) {
            return null
        }

        return { 
            transactionSignature: transaction.transaction.signatures[0],
            baseTransferAmount: baseAmount, 
            quoteTransferAmount: quoteAmount 
        }
    }

}