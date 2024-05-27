import { walletKeyPair } from "@coinpusher/core/solana/constant"
import { PublicKey, SystemProgram, type TransactionInstruction } from "@solana/web3.js"

const jitoTipAddress = new PublicKey("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5")

export class JitoTipInstructionBuilder {

    build(params : {
        tipAmount : bigint,
    }): TransactionInstruction {
        return SystemProgram.transfer({
            fromPubkey: walletKeyPair.publicKey,
            toPubkey: jitoTipAddress,
            lamports: params.tipAmount
        })
    }

}