import { struct, blob } from "@solana/buffer-layout"
import { u64, bool, publicKey } from "@solana/buffer-layout-utils"
import { PublicKey } from "@solana/web3.js"

export interface BuyInstruction {
    instruction: Uint8Array
    amount: bigint
    maxSolCost: bigint
}

export const BuyInstructionLayout = struct<BuyInstruction>([
    blob(8, "instruction"),
    u64("amount"),
    u64("maxSolCost"),
])

export interface BondingCurve {
    virtualTokenReserves: bigint
    virtualSolReserves: bigint
    realTokenReserves: bigint
    realSolReserves: bigint
    tokenTotalSupply: bigint
    complete: boolean
}

export const BondingCurveLayout = struct<BondingCurve>([
    u64("virtualTokenReserves"),
    u64("virtualSolReserves"),
    u64("realTokenReserves"),
    u64("realSolReserves"),
    u64("tokenTotalSupply"),
    bool("complete"),
])

export interface GlobalAccount {
    initialized: boolean
    authority: PublicKey
    feeRecipient: PublicKey
    initialVirtualTokenReserves: bigint
    initialVirtualSolReserves: bigint
    initialRealTokenReserves: bigint
    tokenTotalSupply: bigint
    feeBasisPoints: bigint
}

export const GlobalAccountLayout = struct<GlobalAccount>([
    bool("initialized"),
    publicKey("authority"),
    publicKey("feeRecipient"),
    u64("initialVirtualTokenReserves"),
    u64("initialVirtualSolReserves"),
    u64("initialRealTokenReserves"),
    u64("tokenTotalSupply"),
    u64("feeBasisPoints"),
])