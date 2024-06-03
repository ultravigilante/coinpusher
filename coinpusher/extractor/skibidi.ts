import { broadcaster, type BroadastEvent } from "@coinpusher/broadcast"
import type { RaydiumV4CollectedEvent } from "@coinpusher/collector/solana/engine/raydium-v4"
import type { TweetCollectedEvent } from "@coinpusher/collector/twitter"
import type { UnsubscribeFn } from "@coinpusher/core/channel"
import { database } from "@coinpusher/core/database"
import { DiscordNotifier } from "@coinpusher/core/discord"
import { ZeroLatch } from "@coinpusher/core/latch"
import { Logger } from "@coinpusher/core/logging"
import { JitoTipInstructionBuilder } from "@coinpusher/core/solana/build/instruction/fee/jito-tip"
import { RaydiumV4SwapInstructionBuilder } from "@coinpusher/core/solana/build/instruction/raydium-v4-swap"
import { TransactionBuilder } from "@coinpusher/core/solana/build/transaction"
import { wrappedSolAddress } from "@coinpusher/core/solana/constant"
import { TransactionDispatcher } from "@coinpusher/core/solana/dispatch"
import { JitoTransactionDispatcherEngine } from "@coinpusher/core/solana/dispatch/engine/jito"
import { TransactionEventParser } from "@coinpusher/core/solana/parse"
import type { RaydiumV4SwapEvent } from "@coinpusher/core/solana/parse/event/raydium-v4/swap"
import env from "@coinpusher/env"
import { PublicKey } from "@solana/web3.js"
import axios from "axios"

type PairSideData = {
    mintAddress: string
    addedAmount: bigint
    removedAmount: bigint,
    token : {
        mintedAmount: bigint
        hasMintAuthority: boolean
        hasFreezeAuthority: boolean
    } | null
}

const minTokenAddedFactor = 0.75
const minSolanaAddedAmount = BigInt("450000000000")
const minLiquidityBurnFactor = 0.9
const buyAmount = BigInt("150000")
const jitoTip = BigInt("10000000")

const name = "skibidi"
const precision = 1000


export class Extractor {
    private logger : Logger
    private latch : ZeroLatch
    private unsubscribeFn: UnsubscribeFn

    constructor() {
        this.latch = new ZeroLatch()
        this.logger = new Logger({ path: __filename })

        this.unsubscribeFn = broadcaster.subscribe(ev => {
            if(!env.extractor.active.includes("name")) {
                return
            }

            if(ev.eventType === "raydiumV4") {
                this.onRaydiumV4Event(ev)
            }
        })
    }

    private async sendToDiscord(params : { 
        topic: string,
        contentLines : {name: string, value: string}[]
    }) {
        this.latch.increment()
        await new DiscordNotifier({ 
            webhookURL: env.extractor.discordNotificationWebhookURL 
        }).send([
            `**${name}: ${params.topic}**`,
            ... params.contentLines.map(({name, value}) => `**${name}**: ${value}`)
        ].join("\n"))
        this.latch.decrement()
    }

    private async execute(params : {
        poolAddress: string,
        isTargetBase : boolean,
    }) {

        const positionID = await database
            .insertInto("trade.raydium")
            .values({
                name: name,
                pool_address: params.poolAddress,
                is_target_base: params.isTargetBase
            })
            .returning("id")
            .onConflict(oc => oc.column("pool_address").doNothing())
            .executeTakeFirst()
            .then(row => row?.id)

        if(!positionID) {
            this.logger.debug(`Skipping duplicate position: ${params.poolAddress}`)
            return
        }

        this.logger.info(`Executing trade for pool: ${params.poolAddress}`)

        const [buyInstructions, feeInstruction] = await Promise.all([
            new RaydiumV4SwapInstructionBuilder().build({
                poolAddress: new PublicKey(params.poolAddress),
                amountIn: buyAmount,
                minAmountOut: BigInt("1"),
                targetSide: params.isTargetBase ? "base" : "quote",
            }),
            await new JitoTipInstructionBuilder().build({
                tipAmount: jitoTip
            })
        ])

        if(!buyInstructions.isSuccess) {
            const error = buyInstructions.error.errorType
            this.logger.warn(`Failed to build buy instruction for pool: ${params.poolAddress}. Error: ${error}`)
            return null
        }

        if(!feeInstruction) {
            this.logger.warn(`Failed to build fee instruction for pool: ${params.poolAddress}`)
            return null
        }

        const transaction = await new TransactionBuilder()
            .build([
                ...buyInstructions.value,
                feeInstruction
            ])
            .then(tx => new TransactionDispatcher({
                engine: new JitoTransactionDispatcherEngine()
            }).dispatch(tx))

        if(!transaction) {
            this.logger.warn(`Failed to dispatch transaction for pool: ${params.poolAddress}`)
            return null
        }

        const parsedBuy = new TransactionEventParser().parse(transaction)
            .find((ev) : ev is RaydiumV4SwapEvent => ev.eventType == "raydiumV4Swap")
        
        if(!parsedBuy) {
            this.logger.warn(`Failed to parse buy event for pool: ${params.poolAddress}`)
            return null
        }

        let solanaAmount : bigint
        let tokenAmount : bigint
        if(params.isTargetBase) {
            [solanaAmount, tokenAmount] = [parsedBuy.quoteAmount, parsedBuy.baseAmount]
        } else {
            [solanaAmount, tokenAmount] = [parsedBuy.baseAmount, parsedBuy.quoteAmount]
        }

        this.logger.info(`Bought token for pool: ${params.poolAddress} - transaction: ${parsedBuy.transactionSignature}`)
        await database
            .updateTable("trade.raydium")
            .set({
                solana_buy_amount: solanaAmount.toString(),
                token_buy_amount: tokenAmount.toString()
            })
            .where("id", "=", positionID)
            .execute()
    }

    private async onRaydiumV4Event(msg : RaydiumV4CollectedEvent ) {
        this.latch.increment()
        try {
            this.logger.debug(`Received raydiumV4 event: ${msg.poolAddress}`)
            const row = await database
                .selectFrom("collector.raydium_v4")
                .innerJoin("collector.spl_token as liquidity_spl_token", "liquidity_token_mint_address", "liquidity_spl_token.mint_address")
                .leftJoin("collector.spl_token as base_spl_token", "token_base_mint_address", "base_spl_token.mint_address")
                .leftJoin("collector.spl_token as quote_spl_token", "token_quote_mint_address", "quote_spl_token.mint_address")
                .where("pool_address", "=", msg.poolAddress)
                .select([
                    "liquidity_spl_token.burnt_amount as liquidity_token_burnt_amount",
                    "liquidity_spl_token.minted_amount as liquidity_token_minted_amount",
                    "token_base_added_amount",
                    "token_base_removed_amount",
                    "base_spl_token.id as base_id",
                    "quote_spl_token.id as quote_id",
                    "base_spl_token.has_freeze_authority as base_has_freeze_authority",
                    "base_spl_token.has_mint_authority as base_has_mint_authority",
                    "quote_spl_token.has_freeze_authority as quote_has_freeze_authority",
                    "quote_spl_token.has_mint_authority as quote_has_mint_authority",
                    "base_spl_token.minted_amount as base_token_minted_amount",
                    "quote_spl_token.minted_amount as quote_token_minted_amount",
                    "token_quote_added_amount",
                    "token_quote_removed_amount",
                    "token_base_mint_address",
                    "token_quote_mint_address"
                ])
                .executeTakeFirst()

            if(!row) {
                this.logger.warn(`Critical pool data missing: ${msg.poolAddress}`)
                return
            }

            const [baseData, quoteData] = [{
                mintAddress: row.token_base_mint_address,
                addedAmount: BigInt(row.token_base_added_amount),
                removedAmount: BigInt(row.token_base_removed_amount),
                token: row.base_id ? {
                    mintedAmount: BigInt(row.base_token_minted_amount as string),
                    hasMintAuthority: row.base_has_mint_authority as boolean,
                    hasFreezeAuthority: row.base_has_freeze_authority as boolean
                } : null
            }, {
                mintAddress: row.token_quote_mint_address,
                addedAmount: BigInt(row.token_quote_added_amount),
                removedAmount: BigInt(row.token_quote_removed_amount),
                token: row.quote_id ? {
                    mintedAmount: BigInt(row.quote_token_minted_amount as string),
                    hasMintAuthority: row.quote_has_mint_authority as boolean,
                    hasFreezeAuthority: row.quote_has_freeze_authority as boolean
                } : null
            }]

            let tokenData : PairSideData
            let solanaData : PairSideData
            let isTokenBase : boolean
            if(row.token_base_mint_address === wrappedSolAddress.toBase58()) {
                [isTokenBase, tokenData, solanaData] = [false, quoteData, baseData]
            } else if(row.token_quote_mint_address === wrappedSolAddress.toBase58()) {
                [isTokenBase, tokenData, solanaData] = [true, baseData, quoteData]
            } else {
                this.logger.debug(`Pool does not contain wrapped SOL: ${msg.poolAddress}`)
                return
            }

            if(!tokenData.token) {
                this.logger.debug(`Token data missing for mint: ${tokenData.mintAddress} on pool: ${msg.poolAddress}`)
                return
            }

            if(tokenData.token.hasFreezeAuthority || tokenData.token.hasMintAuthority) {
                this.logger.debug(`Token has mint or freeze authority: ${tokenData.mintAddress} on pool: ${msg.poolAddress}`)
                return
            }

            const netTokenAmount = tokenData.addedAmount - tokenData.removedAmount 
            const netAddedFactor = Number(netTokenAmount * BigInt(precision) / tokenData.token.mintedAmount) / precision
            if(netAddedFactor < minTokenAddedFactor) {
                this.logger.debug(`Token added factor too low: ${netAddedFactor} on pool: ${msg.poolAddress}`)
                return
            }

            const netSolanaAmount = solanaData.addedAmount - solanaData.removedAmount
            if(netSolanaAmount < minSolanaAddedAmount) {
                this.logger.debug(`Solana added amount too low: ${netSolanaAmount} on pool: ${msg.poolAddress}`)
                return
            }

            const liquidityBurntAmount = BigInt(row.liquidity_token_burnt_amount)
            const liquidityMintedAmount = BigInt(row.liquidity_token_minted_amount)
            const liquidityBurnFactor = Number( liquidityBurntAmount * BigInt(precision) / liquidityMintedAmount ) / precision
            if(liquidityBurnFactor < minLiquidityBurnFactor) {
                this.logger.debug(`Liquidity burnt factor too low: ${liquidityBurnFactor} on pool: ${msg.poolAddress}`)
                return
            }

            this.sendToDiscord({
                topic: "Trade Executing",
                contentLines: [
                    { name: "Pool Address", value: msg.poolAddress },
                    { name: "DexScreener URL", value: `<https://www.dexscreener.com/solana/${msg.poolAddress}>` },
                ]
            })

            await this.execute({
                poolAddress: msg.poolAddress,
                isTargetBase: isTokenBase
            })

        } finally {
            this.latch.decrement()
        }
    }

    async stop() {
        this.unsubscribeFn()
        await this.latch.join()
    }
    
}