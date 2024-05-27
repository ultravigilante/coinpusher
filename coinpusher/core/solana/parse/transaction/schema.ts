import { z } from "zod"

const AccountKeyDataSchema = z.object({
    pubkey: z.unknown()
})

export const InstructionDataSchema = z.object({
    programId: z.unknown(),
    data: z.string(),
    stackHeight: z.number().nullable(),
    accounts: z.array(z.unknown())
}).or(z.object({
    programId: z.unknown(),
    stackHeight: z.number().nullable(),
    parsed: z.object({
        type: z.string(),
        info: z.any()
    })
}))


export const TransactionDataSchema = z.object({
    transaction: z.object({
        message: z.object({
            instructions: z.array(InstructionDataSchema),
            accountKeys: z.array(AccountKeyDataSchema)
        }),
        signatures: z.array(z.string()).min(1)
    }),
    meta: z.object({
        innerInstructions: z.array(
            z.object({
                index: z.number(),
                instructions: z.array(InstructionDataSchema)
            })
        ),
        postTokenBalances: z.array(
            z.object({
                accountIndex: z.number(),
                mint: z.string(),
                uiTokenAmount: z.object({
                    amount: z.string(),
                })
            })
        )
    })
})
