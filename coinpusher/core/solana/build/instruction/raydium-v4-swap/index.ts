import { Transaction, TransactionInstruction, type PublicKey } from "@solana/web3.js"
import { Liquidity, TOKEN_PROGRAM_ID, Token, TokenAmount, TxVersion } from "@raydium-io/raydium-sdk"
import type { Optional } from "@coinpusher/core/optional"
import { UserTokenAccountsFinder } from "./token-accounts"
import { RaydiumPoolAccountFinder } from "./pool-account"
import { RaydiumPoolKeysGenerator } from "./pool-keys"
import { heliusRPCURL, walletKeyPair } from "@coinpusher/core/solana/constant"

export type SwapInstructionBuildError = 
    { errorType: "poolAccountFailure" } |
    { errorType: "poolKeysFailure" }

export class RaydiumV4SwapInstructionBuilder {

    async build(params : {
        poolAddress: PublicKey,
        targetSide: "base" | "quote"
        amountIn: bigint,
        minAmountOut: bigint
    }) : Promise<Optional<TransactionInstruction[],SwapInstructionBuildError>> {

        const poolAccount = await new RaydiumPoolAccountFinder()
            .findRaydiumPoolProgramAccount({
                poolAddress: params.poolAddress
            })

        if(!poolAccount) {
            return { 
                isSuccess: false,
                error: { errorType: "poolAccountFailure" }
            }
        }

        const [userTokenAccounts, poolKeys] = await Promise.all([
            new UserTokenAccountsFinder().findUserAccounts(),
            new RaydiumPoolKeysGenerator().generatePoolKeys(poolAccount)
        ])

        if(!poolKeys) {
            return {
                isSuccess: false,
                error: { errorType: "poolKeysFailure" }
            }
        }

        let currencyInMint : PublicKey
        let currencyOutMint : PublicKey
        if(params.targetSide === "base") {
            currencyInMint = poolKeys.quoteMint
            currencyOutMint = poolKeys.baseMint
        } else {
            currencyInMint = poolKeys.baseMint
            currencyOutMint = poolKeys.quoteMint
        }

        const tokenIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, 0)
        const amountIn = new TokenAmount(tokenIn, params.amountIn)
        const tokenOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, 0)
        const amountOut = new TokenAmount(tokenOut, params.minAmountOut)

        const instructions = await Liquidity.makeSwapInstructionSimple({
            connection: heliusRPCURL,
            makeTxVersion: TxVersion.LEGACY,
            poolKeys: poolKeys,
            userKeys: {
                tokenAccounts: userTokenAccounts,
                owner: walletKeyPair.publicKey
            },
            amountIn: amountIn,
            amountOut: amountOut,
            fixedSide: "in",
            config: { bypassAssociatedCheck: false },
        })

        const recentBlockhash = await heliusRPCURL.getLatestBlockhash()
        const transaction = new Transaction()
        transaction.recentBlockhash = recentBlockhash.blockhash
        transaction.lastValidBlockHeight = recentBlockhash.lastValidBlockHeight,
        transaction.feePayer = walletKeyPair.publicKey

        return {
            isSuccess: true,
            value: instructions.innerTransactions[0].instructions.filter(Boolean)
        }
    }
}