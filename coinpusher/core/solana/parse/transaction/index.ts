import { z } from "zod"
import { TransactionDataSchema, InstructionDataSchema } from "./schema"

type RawInstructionPayload = { value: string, accounts: string[] }
type ParsedInstructionPayload = { type : string, value: any }

export type TransactionInstruction = {
    programID: string
    payloadType: "parsed"
    payload : ParsedInstructionPayload
    instructions : TransactionInstruction[]
} | {
    programID: string
    payloadType: "raw"
    payload : RawInstructionPayload
    instructions : TransactionInstruction[]
}

export type Transaction = {
    signature : string
    instructions : TransactionInstruction[],
    balances : {
        mint : string,
        account : string,
        amount : string
    }[]
}

type TransactionData = z.infer<typeof TransactionDataSchema>
type InstructionData = z.infer<typeof InstructionDataSchema>

export class TransactionParser {

    private constructInstruction(data : InstructionData) : TransactionInstruction {
        const partialInstruction = {
            programID: String(data.programId),
            instructions: []
        }

        if("parsed" in data) {
            const payload = { type: data.parsed.type, value: data.parsed.info }
            return {
                ... partialInstruction,
                payloadType: "parsed",
                payload: payload
            }
        }

        const payload = { value: data.data, accounts: data.accounts.map(x => String(x)) }
        return {
            ... partialInstruction,
            payloadType: "raw",
            payload: payload 
        }
    }

    private constructTransaction(data : TransactionData) : Transaction {
        const innerIndexMap : {[key : number] : InstructionData[]} = {}
        for(const innerInstruction of data.meta.innerInstructions) {
            innerIndexMap[innerInstruction.index] = innerInstruction.instructions
        }

        const flattenedInstructions : [TransactionInstruction, number][] = []
        const outerInstructions : TransactionInstruction[]  = []
        for(let ix = 0; ix < data.transaction.message.instructions.length; ix += 1) {
            const outerInstructionData = data.transaction.message.instructions[ix]
            const outerInstruction = this.constructInstruction(outerInstructionData)
            outerInstructions.push(outerInstruction)

            flattenedInstructions.push([outerInstruction, outerInstructionData.stackHeight || 1])
            for(const innerInstructionData of innerIndexMap[ix] || []) {
                const innerInstruction = this.constructInstruction(innerInstructionData)
                flattenedInstructions.push([innerInstruction, innerInstructionData.stackHeight || 1])
            }
        }

        let currentStack : TransactionInstruction[] = []
        for(const [instruction, stackHeight] of flattenedInstructions) {
            while(currentStack.length >= stackHeight) {
                const innerInstruction = currentStack.pop()
                if(innerInstruction === undefined) {
                    throw new Error("Invalid stack height")
                }
            }
            if(currentStack.length > 0) {
                const topInstruction = currentStack[currentStack.length - 1]
                topInstruction.instructions.push(instruction)
            }
            currentStack.push(instruction)
        }

        const transaction : Transaction = {
            signature: data.transaction.signatures[0],
            instructions: outerInstructions,
            balances: data.meta.postTokenBalances.map((balance) => {
                const account = String(data.transaction.message.accountKeys[balance.accountIndex].pubkey)
                return { account, amount: balance.uiTokenAmount.amount, mint: balance.mint }
            })
        }

        return transaction
    }

    parse(data : any) : Transaction | null {
        const parsed = TransactionDataSchema.safeParse(data)
        if(!parsed.success) {
            return null
        }

        return this.constructTransaction(parsed.data)
    }

}
