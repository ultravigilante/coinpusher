import type { UnsubscribeFn } from "@coinpusher/core/channel"
import { database } from "@coinpusher/core/database"
import { ZeroLatch } from "@coinpusher/core/latch"
import { Logger } from "@coinpusher/core/logging"
import { DynamicPriorityFeeInstructionBuilder } from "@coinpusher/core/solana/build/instruction/fee/priority/dynamic"
import { PumpBuyInstructionBuilder } from "@coinpusher/core/solana/build/instruction/pump"
import { TransactionBuilder } from "@coinpusher/core/solana/build/transaction"
import { pumpProgramAddress } from "@coinpusher/core/solana/constant"
import { SpamTransactionDispatcher } from "@coinpusher/core/solana/dispatch/spam"
import { TransactionEventParser } from "@coinpusher/core/solana/parse"
import type { PumpBuyEvent } from "@coinpusher/core/solana/parse/event/pump/buy"
import env from "@coinpusher/env"
import { tweetChannel, type Tweet } from "@coinpusher/origin/twitter"
import { PublicKey } from "@solana/web3.js"
import axios from "axios"

const discordHeaders = { "Accept-Encoding": "gzip" }

export class PumpTwitterExtractor {

    private buyAmount : bigint
    private maxBuyAmount : bigint
    private logger : Logger
    private minFollowerCount : number
    private latch : ZeroLatch
    private unsubscribeFn : UnsubscribeFn
    private feeScaler : number
    private variant : string

    constructor(params : {
        variant : string,
        buyAmount : bigint,
        maxBuyAmount : bigint,
        minFollowerCount: number,
        feeScaler: number,
    }) {
        this.variant = params.variant
        this.buyAmount = params.buyAmount
        this.maxBuyAmount = params.maxBuyAmount
        this.minFollowerCount = params.minFollowerCount
        this.feeScaler = params.feeScaler

        this.latch = new ZeroLatch()
        this.logger = new Logger({ path: __filename })
        this.unsubscribeFn = tweetChannel.subscribe(async tweet => {
            this.latch.increment()
            await this.onTweet(tweet)
        })
    }

    private generateDiscordInfoLine(p : { name: string, value: string }) {
        return `**${p.name}**: ${p.value}\``
    }

    private async sendToDiscord(params : { 
        topic: string,
        contentLines : string[]
    }) {
        await axios.post(env.extractor.pumpTweet.discordNotificationWebhookURL, {
            content: [
                `**${params.topic}**`,
                ... params.contentLines
            ].join("\n")
        }, { headers : discordHeaders }).catch(() => null)
    }

    private async buy(tokenMint : string) {
        const [buyInstructions, feeInstruction] = await Promise.all([
            new PumpBuyInstructionBuilder().build({
                tokenMint: new PublicKey(tokenMint), 
                solanaAmount: this.buyAmount,
                maxSolanaAmount: this.maxBuyAmount,
            }),
            await new DynamicPriorityFeeInstructionBuilder().build({
                feeScaler: this.feeScaler,
                account: pumpProgramAddress.toBase58()
            })
        ])

        if(!buyInstructions.isSuccess) {
            const error = buyInstructions.error.errorType
            this.logger.warn(`Failed to build buy instruction for token mint: ${tokenMint}. Error: ${error}`)
            return
        }

        if(!feeInstruction) {
            this.logger.warn(`Failed to build fee instruction for token mint: ${tokenMint}`)
            return
        }

        const transaction = await new TransactionBuilder()
            .build([
                ...buyInstructions.value,
                feeInstruction
            ])
            .then(tx => new SpamTransactionDispatcher().dispatch(tx))

        if(!transaction) {
            this.logger.warn(`Failed to dispatch transaction for token mint: ${tokenMint}`)
            return
        }

        const parsedBuy = new TransactionEventParser().parse(transaction)
            .find((ev) : ev is PumpBuyEvent => ev.eventType == "pumpBuy")
        
        if(!parsedBuy) {
            this.logger.warn(`Failed to parse buy event for token mint: ${tokenMint}`)
            return
        }

        return { 
            signature: parsedBuy.transactionSignature,
            solanaAmount: parsedBuy.solAmount,
            tokenAmount: parsedBuy.tokenAmount
        }
    }

    private async onTweet(tweet : Tweet) {
        try {
            this.logger.debug(`Received tweet: ${tweet.url}`)
            if(tweet.author.followerCount < this.minFollowerCount) {
                this.logger.debug(`Skipping tweet with low follower count: ${tweet.author.followerCount}`)
                return
            }

            for(const url of tweet.content.urls) {
                const parsedURL = new URL(url)
                if(!parsedURL.hostname.endsWith("pump.fun")) {
                    continue
                }
                const match = parsedURL.pathname.match(/\/([A-Za-z0-9]+)/)
                if(!match) {
                    continue
                }

                const positionID = await database
                    .insertInto("extractor.pump_twitter")
                    .values({
                        follower_count: tweet.author.followerCount,
                        token_mint: match[1],
                        tweet_url: tweet.url,
                        variant: this.variant,
                    })
                    .returning("id")
                    .onConflict(oc => oc.columns(["variant", "token_mint"]).doNothing())
                    .executeTakeFirst()
                    .then(row => row?.id)

                if(!positionID) {
                    this.logger.debug(`Skipping duplicate position: ${this.variant}.${match[1]}`)
                    continue
                }

                const swap = await this.buy(match[1])
                const notificationMetadata = [
                    { name: "Token Mint", value: match[1] },
                    { name: "Tweet URL", value: tweet.url },
                    { name: "Follower Count", value: tweet.author.followerCount.toLocaleString() },
                    { name: "Pump URL", value: `<https://www.pump.fun/${match[1]}>` },
                ]

                if(!swap) {
                    this.logger.info(`Failed to buy token for mint: ${match[1]} - skipping`)
                    await this.sendToDiscord({
                        topic: "Trade Failure!",
                        contentLines: notificationMetadata
                            .map((x) => this.generateDiscordInfoLine(x))
                    })
                    continue
                }

                await database
                    .updateTable("extractor.pump_twitter")
                    .set({
                        solana_buy_amount: swap.solanaAmount.toString(),
                        token_buy_amount: swap.tokenAmount.toString()
                    })
                    .where("id", "=", positionID)
                    .execute()

                this.logger.info(`Bought token for mint: ${match[1]} - transaction: ${swap.signature}`)
                await this.sendToDiscord({
                    topic: "Trade Success!",
                    contentLines: [
                        ... notificationMetadata,
                        { name: "Solana Buy Amount", value: swap.solanaAmount.toString() },
                        { name: "Token Buy Amount", value: swap.tokenAmount.toString() },
                        { name: "Transaction Signature", value: swap.signature }
                    ].map((x) => this.generateDiscordInfoLine(x))
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