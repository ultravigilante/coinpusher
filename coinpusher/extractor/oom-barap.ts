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

const minFollowerCount = 1
const buyAmount = BigInt("150000")
const jitoTip = BigInt("10000000")
const name = "oomBarap"

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
            } else if(ev.eventType === "tweet") {
                this.onTweet(ev)
            }
        })
    }

    private async sendToDiscord(params : { 
        topic: string,
        contentLines : { name : string, value : string }[]
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
        isTargetBase : boolean
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
            const rows = await database
                .selectFrom("collector.tweet")
                .innerJoin("collector.tweet_pump_token_mint_address", "tweet_id", "collector.tweet.id")
                .innerJoin("collector.raydium_v4", join => join.on(eb => eb.or([
                    eb("collector.raydium_v4.token_base_mint_address", "=", eb.ref("collector.tweet_pump_token_mint_address.token_mint_address")),
                    eb("collector.raydium_v4.token_quote_mint_address", "=", eb.ref("collector.tweet_pump_token_mint_address.token_mint_address")),
                ])))
                .select([
                    "token_mint_address",
                    "collector.raydium_v4.token_base_mint_address",
                    "collector.raydium_v4.pool_address",
                    "collector.tweet.twitter_id",
                    "follower_count",
                    "username"
                ])
                .where("pool_address", "=", msg.poolAddress)
                .where("follower_count", ">=", minFollowerCount)
                .execute()

            for(const row of rows) {
                this.sendToDiscord({
                    topic: "Trade Executing (Via Twitter)",
                    contentLines: [
                        { name: "Pool Address", value: row.pool_address },
                        { name: "Tweet URL", value:  `https://twitter.com/${row.username}/status/${row.twitter_id}`},
                        { name: "Follower Count", value: row.follower_count.toLocaleString() },
                        { name: "DexScreener URL", value: `<https://www.dexscreener.com/solana/${row.pool_address}>` },
                    ]
                })
                await this.execute({
                    poolAddress: row.pool_address,
                    isTargetBase: row.token_base_mint_address === row.token_mint_address,
                })
            }
        } finally {
            this.latch.decrement()
        }
    }

    private async onTweet(msg : TweetCollectedEvent ) {
        this.latch.increment()
        try {
            this.logger.debug(`Received tweet event: ${msg.tweetID}`)
            const rows = await database
                .selectFrom("collector.tweet")
                .innerJoin("collector.tweet_dexscreener_pool_address", "tweet_id", "collector.tweet.id")
                .innerJoin("collector.raydium_v4", join => join.on(eb => eb.or([
                    eb("collector.raydium_v4.pool_address", "=", eb.ref("collector.tweet_dexscreener_pool_address.pool_address")),
                    eb(eb.fn("lower", ["collector.raydium_v4.pool_address"]), "=", eb.ref("collector.tweet_dexscreener_pool_address.pool_address")),
                ])))
                .select([
                    "collector.raydium_v4.token_base_mint_address",
                    "token_quote_mint_address",
                    "collector.raydium_v4.pool_address",
                    "collector.tweet.twitter_id",
                    "follower_count",
                    "username"
                ])
                .where("collector.tweet.twitter_id", "=", msg.tweetID)
                .where("follower_count", ">=", minFollowerCount)
                .execute()


            for(const row of rows) {
                let isTargetBase : boolean
                if(row.token_quote_mint_address === wrappedSolAddress.toBase58()) {
                    isTargetBase = true
                } else if(row.token_base_mint_address === wrappedSolAddress.toBase58()) {
                    isTargetBase = false
                } else {
                    this.logger.debug(`Non WSOL pool: ${row.pool_address} - skipping`)
                    continue
                }

                this.sendToDiscord({
                    topic: "Trade Executing (Via RaydiumV4)",
                    contentLines: [
                        { name: "Pool Address", value: row.pool_address },
                        { name: "Tweet URL", value:  `https://twitter.com/${row.username}/status/${row.twitter_id}`},
                        { name: "Follower Count", value: row.follower_count.toLocaleString() },
                        { name: "DexScreener URL", value: `<https://www.dexscreener.com/solana/${row.pool_address}>` },
                    ]
                })

                await this.execute({
                    poolAddress: row.pool_address,
                    isTargetBase: isTargetBase
                })
            }
        } finally {
            this.latch.decrement()
        }
    }

    async stop() {
        this.unsubscribeFn()
        await this.latch.join()
    }
    
}