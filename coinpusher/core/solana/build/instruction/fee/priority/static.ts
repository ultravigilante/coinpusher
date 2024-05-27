import { TransactionInstruction, ComputeBudgetProgram } from "@solana/web3.js";

export class StaticPriorityFeeInstructionBuilder {
    build(microLamports : bigint) : TransactionInstruction {
        return ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: microLamports
        })
    }
}