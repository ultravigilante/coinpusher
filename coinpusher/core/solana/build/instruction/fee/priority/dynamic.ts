import { heliusRPCURL } from "@coinpusher/core/solana/constant"
import { ComputeBudgetProgram, TransactionInstruction } from "@solana/web3.js"
import axios from "axios"

const highPriority = "High"
const precision = 1_000

export class DynamicPriorityFeeInstructionBuilder {

    async build(params : {
        account : string,
        feeScaler : number,
    }) : Promise<TransactionInstruction | null> {
        let data : any
        try {
            data = await axios.post(heliusRPCURL.rpcEndpoint, {
                jsonrpc: "2.0",
                id: "1",
                method: "getPriorityFeeEstimate",
                params: [
                    {
                        accountKeys: [params.account],
                        options: { priorityLevel: highPriority },
                    }
                ],
            }, {
                headers: { "Content-Type": "application/json" },
            }).then(resp => resp.data)
        } catch(e) {
            return null
        }

        const estimate = data?.result?.priorityFeeEstimate || null
        if(!estimate) {
            return null
        }

        const scaledEstimate = BigInt(estimate) * BigInt(params.feeScaler * precision) / BigInt(precision)
        return ComputeBudgetProgram.setComputeUnitPrice({ microLamports: scaledEstimate })
    }

}