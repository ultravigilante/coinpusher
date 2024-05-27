import { collectorEventChannel } from "@coinpusher/collector/solana"
import type { Channel, UnsubscribeFn } from "@coinpusher/core/channel"
import type { Database } from "@coinpusher/core/database"
import { Logger } from "@coinpusher/core/logging"
import { DynamicPriorityFeeInstructionBuilder } from "@coinpusher/core/solana/build/instruction/fee/priority/dynamic"
import { RaydiumV4SwapInstructionBuilder } from "@coinpusher/core/solana/build/instruction/raydium-v4-swap"
import { TransactionBuilder } from "@coinpusher/core/solana/build/transaction"
import { SpamTransactionDispatcher } from "@coinpusher/core/solana/dispatch/spam"
import { TransactionEventParser } from "@coinpusher/core/solana/parse"
import { type RaydiumV4SwapEvent } from "@coinpusher/core/solana/parse/event/raydium-v4/swap"
import { PublicKey, type Connection, type Keypair } from "@solana/web3.js"

type Schedule = {
    multiple: number
    holdFactor: number
}[]

const pollIntervalMs = 2_500
const spamIntervalMs = 40
const maxInitializeAgeMs = 5_000
const feeScaler = 2.5
const precision = 100

export class ShaxianExtractor {

    private connection : Connection
    private walletKeypair : Keypair
    private buyAmount : bigint
    private schedule : Schedule
    private unburntLiquidityGracePeriodMs: number
    private minAddedSolanaLiquidity: bigint
    private minBurntLiquidityFactor: number
    private minAddedTokenFactor: number
    private variant : string
    private logger : Logger
    private database : Database
    private unsubscribeFn: UnsubscribeFn

    constructor(params : {
        variant : string,
        buyAmount : bigint,
        schedule : Schedule,
        unburntLiquidityGracePeriodMs: number,
        minAddedSolanaLiquidity: bigint,
        minBurntLiquidityFactor: number,
        minAddedTokenFactor: number,
    }) {
        this.logger = new Logger({ path: __filename })
        this.buyAmount = params.buyAmount
        this.variant = params.variant
        this.minBurntLiquidityFactor = params.minBurntLiquidityFactor
        this.schedule = params.schedule
        this.unburntLiquidityGracePeriodMs = params.unburntLiquidityGracePeriodMs
        this.minAddedSolanaLiquidity = params.minAddedSolanaLiquidity
        this.minAddedTokenFactor = params.minAddedTokenFactor
        this.unsubscribeFn = collectorEventChannel.subscribe((ev) => {
            if(ev.eventType === "SPLToken") {
                
            }
            // convert and filter to shax event
            // onNew - onExisting

        })
    }

    private async onRaydiumUpdate(raydiumUpdate : RaydiumV4Update) {
        let tokenData : TokenData
        let solanaData : TokenData
        let targetSide : "base" | "quote"
        if(raydiumUpdate.tokenBase.mintAddress == wrappedSolAddress) {
            [tokenData, solanaData, targetSide] = [raydiumUpdate.tokenBase, raydiumUpdate.tokenQuote, "base"]
        } else if(raydiumUpdate.tokenQuote.mintAddress == wrappedSolAddress) {
            [tokenData, solanaData, targetSide] = [raydiumUpdate.tokenQuote, raydiumUpdate.tokenBase, "quote"]
        } else {
            this.logger.debug(`Pool does not involve wrapped SOL: ${raydiumUpdate.poolAddress}`)
            return
        }

        if(!tokenData.withMetadata) {
            this.logger.debug(`Token metadata not known for mint: ${tokenData.mintAddress}`)
            return
        }

        const poolAddress = raydiumUpdate.poolAddress
        const tokenMintAddress = tokenData.mintAddress
        const isTokenBase = targetSide == "base"
        const tokenAddedAmount = tokenData.addedAmount
        const tokenRemovedAmount = tokenData.removedAmount
        const tokenMintedAmount = tokenData.mintedAmount
        const tokenAmount = tokenData.amount
        const solanaAddedAmount = solanaData.addedAmount
        const solanaRemovedAmount = solanaData.removedAmount
        const solanaAmount = solanaData.amount
        const liquidityTokenMintedAmount = raydiumUpdate.liquidityToken.mintedAmount
        const liquidityTokenBurntAmount = raydiumUpdate.liquidityToken.burntAmount
        const initializedAt = raydiumUpdate.initializedAt

        const positionRow = await this.database
            .selectFrom("extractor.shaxian_raydium_v4")
            .selectAll()
            .where("pool_address", "=", poolAddress)
            .where("variant", "=", this.variant)
            .executeTakeFirst()

        if(!positionRow) {
            const cutoffDate = new Date(Date.now() - maxInitializeAgeMs)
            if(initializedAt < cutoffDate) {
                this.logger.debug(`Pool is too old to consider: ${poolAddress}`)
                return
            }

            // freeze and mint

            const netTokenAddedAmount = tokenAddedAmount - tokenRemovedAmount
            const addedTokenFactor = Number(netTokenAddedAmount * BigInt(precision) / tokenMintedAmount) / precision
            if(addedTokenFactor < this.minAddedTokenFactor) {
                this.logger.debug(`Added token factor is too low: ${addedTokenFactor}`)
                return
            }

            const netSolanaAddedAmount = solanaAddedAmount - solanaRemovedAmount
            if(netSolanaAddedAmount < this.minAddedSolanaLiquidity) {
                this.logger.debug(`Net Solana liquidity is too low: ${netSolanaAddedAmount}`)
                return
            }

            const positionID = await this.database
                .insertInto("extractor.shaxian_raydium_v4")
                .values({
                    variant: this.variant,
                    pool_address: poolAddress,
                    is_token_base: isTokenBase,
                })
                .returning("id")
                .executeTakeFirstOrThrow()
                .then(row => row.id)

            const swapEvent = await this.swap({
                positionID: positionID,
                poolAddress: poolAddress,
                isTokenBase: isTokenBase,
                targetSide: isTokenBase ? "base" : "quote"
            })

            if(!swapEvent) {
                this.logger.warn(`Failed to buy initial token amount: ${poolAddress}`)
                return
            }

            await this.database
                .updateTable("extractor.shaxian_raydium_v4")
                .where("id", "=", positionID)
                .set(eb => ({
                    buy_token_amount: eb("buy_token_amount", "+", swapEvent.tokenAmount.toString()),
                    buy_solana_amount: eb("sell_solana_amount", "+", swapEvent.solanaAmount.toString())
                }))
                .execute()

            this.logger.info(`Swapped ${swapEvent.solanaAmount} SOL for ${swapEvent.tokenAmount} token: ${tokenMintAddress} on pool: ${poolAddress} [${swapEvent.transactionSignature}]`)
            return
        }

        const tokensBought = BigInt(positionRow.buy_token_amount)
        const tokensSold = BigInt(positionRow.sell_token_amount)
        const netTokenHeld = tokensBought - tokensSold
        if(netTokenHeld <= BigInt(0)) {
            return
        }

        const unscaledInitialPrice = BigInt(positionRow.buy_solana_amount) / BigInt(positionRow.buy_token_amount)
        const unscaledLivePrice = solanaAmount / tokenAmount
        const priceMultiple = unscaledLivePrice / unscaledInitialPrice

        const liquidityBurntFactor = liquidityTokenBurntAmount * BigInt(precision) / liquidityTokenMintedAmount
        const maxInitializedDate = new Date(Date.now() - this.unburntLiquidityGracePeriodMs)
        const needsFullLiquidation = 
            liquidityBurntFactor < this.minBurntLiquidityFactor && 
            initializedAt < maxInitializedDate

        const holdFactor = needsFullLiquidation
            ? 0
            : this.schedule.find(knot => knot.multiple <= priceMultiple)?.holdFactor || 1.0

        const newAmountToHold = tokensBought * BigInt(holdFactor * precision) / BigInt(precision)
        const amountToSell = netTokenHeld - newAmountToHold
        if(amountToSell <= BigInt(0)) {
            return
        }

        const swapEvent = await this.swap({
            positionID: positionRow.id,
            poolAddress: poolAddress,
            isTokenBase: isTokenBase,
            targetSide: isTokenBase ? "quote" : "base"
        })

        if(!swapEvent) {
            this.logger.warn(`Failed to sell token amount: ${poolAddress}`)
            return
        }

        this.logger.info(`Swapped ${swapEvent.tokenAmount} of token: ${tokenMintAddress} for ${swapEvent.solanaAmount} SOL on pool: ${poolAddress} [${swapEvent.transactionSignature}]`)

        await this.database
            .updateTable("extractor.shaxian_raydium_v4")
            .where("id", "=", positionRow.id)
            .set(eb => ({
                sell_token_amount: eb("sell_token_amount", "+", swapEvent.tokenAmount.toString()),
                sell_solana_amount: eb("sell_solana_amount", "+", swapEvent.solanaAmount.toString())
            }))
            .execute()
    }

    private async swap(params : {
        positionID : number,
        poolAddress: string,
        isTokenBase: boolean,
        targetSide: "base" | "quote",
    }) {
        const [swapInstructions, feeInstruction] = await Promise.all([
            new RaydiumV4SwapInstructionBuilder({
                connection: this.connection,
            }).build({
                poolAddress: new PublicKey(params.poolAddress),
                amountIn: this.buyAmount,
                targetSide: params.targetSide,
                walletAddress: this.walletKeypair.publicKey
            }),
            await new DynamicPriorityFeeInstructionBuilder({
                connection: this.connection,
            }).build({
                account: raydiumV4ProgramAddress,
                feeScaler: feeScaler,
            })
        ])

        if(!swapInstructions.isSuccess) {
            const error = swapInstructions.error.errorType
            this.logger.debug(`Failed to build swap instruction due to error: ${error}`)
            return null
        }

        if(!feeInstruction) {
            this.logger.debug(`Failed to build fee instruction`)
            return null
        }

        const swapTransaction = await new TransactionBuilder({
            walletKeypair: this.walletKeypair,
            connection: this.connection,
        }).build([
            feeInstruction,
            ... swapInstructions.value
        ])

        const transaction = new SpamTransactionDispatcher({
            connection: this.connection,
            walletKeypair: this.walletKeypair,
            pollIntervalMs: pollIntervalMs,
            spamIntervalMs: spamIntervalMs,
        }).dispatch(swapTransaction)

        if(!transaction) {
            this.logger.debug(`Failed to dispatch transaction`)
            return null
        }

        const parsedSwap = new TransactionEventParser().parse(transaction)
            .find((ev) : ev is RaydiumV4SwapEvent => ev.eventType === "raydiumV4Swap")
        
        if(!parsedSwap) {
            this.logger.debug(`Failed to parse swap event`)
            return null
        }

        await this.database
            .insertInto("extractor.shaxian_raydium_v4_trade")
            .values({
                shaxian_raydium_v4_id: params.positionID,
                transaction_signature: parsedSwap.transactionSignature,
            })
            .execute()

        const [tokenAmount, solanaAmount] = params.isTokenBase
            ? [parsedSwap.baseAmount, parsedSwap.quoteAmount]
            : [parsedSwap.quoteAmount, parsedSwap.baseAmount]
        return { tokenAmount, solanaAmount, transactionSignature: parsedSwap.transactionSignature }
    }
}