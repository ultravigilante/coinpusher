import { broadcaster, type BroadastEvent } from "@coinpusher/broadcast"
import type { TweetCollectedEvent } from "@coinpusher/collector/twitter"
import type { UnsubscribeFn } from "@coinpusher/core/channel"
import { database } from "@coinpusher/core/database"
import { DiscordNotifier } from "@coinpusher/core/discord"
import { ZeroLatch } from "@coinpusher/core/latch"
import { Logger } from "@coinpusher/core/logging"
import { JitoTipInstructionBuilder } from "@coinpusher/core/solana/build/instruction/fee/jito-tip"
import { PumpBuyInstructionBuilder } from "@coinpusher/core/solana/build/instruction/pump"
import { TransactionBuilder } from "@coinpusher/core/solana/build/transaction"
import { TransactionDispatcher } from "@coinpusher/core/solana/dispatch"
import { JitoTransactionDispatcherEngine } from "@coinpusher/core/solana/dispatch/engine/jito"
import { TransactionEventParser } from "@coinpusher/core/solana/parse"
import type { PumpBuyEvent } from "@coinpusher/core/solana/parse/event/pump/buy"
import env from "@coinpusher/env"
import { PublicKey } from "@solana/web3.js"

const minFollowerCount = 1
const buyAmount = BigInt("150000")
const maxBuyAmount = BigInt("300000")
const jitoTip = BigInt("10000000")
const name = "aldonna"

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

            if(ev.eventType === "tweet") {
                this.onTweet(ev)
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
        tokenMintAddress : string,
    }) {
        const positionID = await database
            .insertInto("trade.pump")
            .values({
                name: name,
                token_mint_address: params.tokenMintAddress
            })
            .returning("id")
            .onConflict(oc => oc.column("token_mint_address").doNothing())
            .executeTakeFirst()
            .then(row => row?.id)

        if(!positionID) {
            this.logger.debug(`Skipping duplicate position: ${params.tokenMintAddress}`)
            return
        }

        this.logger.info(`Executing trade for mint: ${params.tokenMintAddress}`)

        const [buyInstructions, feeInstruction] = await Promise.all([
            new PumpBuyInstructionBuilder().build({
                tokenMint: new PublicKey(params.tokenMintAddress), 
                solanaAmount: buyAmount,
                maxSolanaAmount: maxBuyAmount,
            }),
            await new JitoTipInstructionBuilder().build({
                tipAmount: jitoTip,
            })
        ])

        if(!buyInstructions.isSuccess) {
            const error = buyInstructions.error.errorType
            this.logger.warn(`Failed to build buy instruction for token mint: ${params.tokenMintAddress}. Error: ${error}`)
            return null
        }

        if(!feeInstruction) {
            this.logger.warn(`Failed to build fee instruction for token mint: ${params.tokenMintAddress}`)
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
            this.logger.warn(`Failed to dispatch transaction for token mint: ${params.tokenMintAddress}`)
            return null
        }

        const parsedBuy = new TransactionEventParser().parse(transaction)
            .find((ev) : ev is PumpBuyEvent => ev.eventType == "pumpBuy")
        
        if(!parsedBuy) {
            this.logger.warn(`Failed to parse buy event for token mint: ${params.tokenMintAddress}`)
            return null
        }

        this.logger.info(`Bought token for mint: ${params.tokenMintAddress} - transaction: ${parsedBuy.transactionSignature}`)
        await database
            .updateTable("trade.pump")
            .set({
                solana_buy_amount: parsedBuy.solanaAmount.toString(),
                token_buy_amount: parsedBuy.tokenAmount.toString()
            })
            .where("id", "=", positionID)
            .execute()
    }

    private async onTweet(tweetEvent : TweetCollectedEvent) {
        this.latch.increment()
        try {
            this.logger.debug(`Received tweet: ${tweetEvent.tweetID}`)
            const rows = await database
                .selectFrom("collector.tweet")
                .innerJoin("collector.tweet_pump_token_mint_address", "tweet_id", "collector.tweet.id")
                .select([
                    "collector.tweet_pump_token_mint_address.token_mint_address",
                    "username",
                    "collector.tweet.twitter_id",
                    "follower_count"
                ])
                .where("twitter_id", "=", tweetEvent.tweetID)
                .where("follower_count", ">=", minFollowerCount)
                .execute()

            for(const row of rows) {
                this.sendToDiscord({
                    topic: "Trade Executing",
                    contentLines: [
                        { name: "Token Mint", value: row.token_mint_address},
                        { name: "Tweet URL", value:  `https://twitter.com/${row.username}/status/${row.twitter_id}` },
                        { name: "Follower Count", value: row.follower_count.toLocaleString() },
                        { name: "Pump URL", value: `<https://www.pump.fun/${row.token_mint_address}>` },
                    ]
                })

                await this.execute({ tokenMintAddress: row.token_mint_address })
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