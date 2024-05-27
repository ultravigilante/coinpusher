import env from "@coinpusher/env";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { decode } from "bs58";

export const raydiumV4AuthorityAddress = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1")
export const raydiumV4ProgramAddress = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8")
export const raydiumCPProgramAddress = new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C")
export const raydiumCPAuthorityAddress = new PublicKey("GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL")

export const pumpMintAuthorityAddress = new PublicKey("TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM")
export const pumpProgramAddress = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
export const pumpGlobalAccountAddress = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf")

export const tokenProgramAddress = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
export const systemProgramAddress = new PublicKey("11111111111111111111111111111111")
export const wrappedSolAddress = new PublicKey("So11111111111111111111111111111111111111112")
export const rentProgramAddress = new PublicKey("SysvarRent111111111111111111111111111111111")

export const heliusRPCURL = new Connection(
    `https://mainnet.helius-rpc.com?api-key=${env.core.solana.heliusAPIKey}`
)

export const walletKeyPair = Keypair.fromSecretKey(
    decode(env.core.solana.walletSecretKey)
)