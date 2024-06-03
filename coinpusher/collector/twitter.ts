import { TweetContentParser, TwitterUserParser, type TwitterUser } from "@coinpusher/core/twitter/parse";
import { z } from "zod";
import { Logger } from "@coinpusher/core/logging";
import { ZeroLatch } from "@coinpusher/core/latch";
import type { Subprocess } from "bun";
import { safeParseJSON } from "@coinpusher/core/json";
import { database } from "@coinpusher/core/database";
import { PumpURLTokenMintAddressParser } from "@coinpusher/core/twitter/parse/url/pump";
import { DexScreenerURLPoolAddressParser } from "@coinpusher/core/twitter/parse/url/dex-screener";
import { broadcaster } from "@coinpusher/broadcast";

export type TweetCollectedEvent = {
    eventType: "tweet"
    tweetID : string,
}

const TwitterAPIResponseSchema = z.object({
    data: z.any(),
    includes: z.object({
        users: z.array(z.any()),
    }).optional(),
})

export class Collector {

    private shouldStop : boolean
    private latch : ZeroLatch
    private logger : Logger
    private proc : Subprocess | null

    constructor() {
        this.shouldStop = false
        this.latch = new ZeroLatch()
        this.logger = new Logger({ path: __filename })
        this.proc = null
        this.run()
    }

    async run() {
        while(!this.shouldStop) {
            this.latch.increment()
            // This child process is a hack because bun doesn't correctly support AbortController...
            this.proc = Bun.spawn(["bun", "script/child/twitter-stream.ts"], {
                onExit: () => this.latch.decrement(),
                ipc: async (data : string) => {
                    this.latch.increment()
                    try {
                        const parsed = safeParseJSON(data)
                        if(!parsed) {
                            return
                        }

                        const twitterData = TwitterAPIResponseSchema.safeParse(parsed)
                        if(!twitterData.success) {
                            this.logger.warn(`Failed to parse Twitter API response: ${twitterData.error}`)
                            return
                        }
            
                        const userDataList = twitterData.data.includes?.users || []
                        const userLookup = new Map<string, TwitterUser>()
            
                        for(const userData of userDataList) {
                            const parsedUser = new TwitterUserParser().parse(userData)
                            if(!parsedUser) {
                                this.logger.warn(`Failed to parse twitter user data: ${JSON.stringify(userData)}`)
                                continue
                            }
                            userLookup.set(parsedUser.userID, parsedUser)
                        }
            
                        const parsedTweet = new TweetContentParser().parse(twitterData.data.data)
                        if(!parsedTweet) {
                            this.logger.warn(`Failed to parse tweet data: ${JSON.stringify(twitterData.data.data)}`)
                            return
                        }
        
                        const user = userLookup.get(parsedTweet.authorID)
                        if(!user) {
                            this.logger.warn(`Failed to find user for tweet: ${JSON.stringify(parsedTweet)}`)
                            return
                        }

                        this.logger.debug(`Collected tweet: ${parsedTweet.tweetID}`)
                        const rowID = await database
                            .insertInto("collector.tweet")
                            .values({
                                twitter_id: parsedTweet.tweetID,
                                twitter_author_id: user.userID,
                                text: parsedTweet.text,
                                follower_count: user.followerCount,
                                following_count: user.followingCount,
                                username: user.username
                            })
                            .returning("id")
                            .executeTakeFirstOrThrow()
                            .then(row => row.id)

                        for(const url of parsedTweet.urls) {
                            const pumpTokenMint = new PumpURLTokenMintAddressParser().parse(url)
                            if(pumpTokenMint) {
                                await database
                                    .insertInto("collector.tweet_pump_token_mint_address")
                                    .values({
                                        token_mint_address: pumpTokenMint,
                                        tweet_id: rowID
                                    })
                                    .execute()
                            }

                            const dexscreenerPoolAddress = new DexScreenerURLPoolAddressParser().parse(url)
                            if(dexscreenerPoolAddress) {
                                await database
                                    .insertInto("collector.tweet_dexscreener_pool_address")
                                    .values({
                                        pool_address: dexscreenerPoolAddress,
                                        tweet_id: rowID
                                    })
                                    .execute()
                            }
                        }
        
                        broadcaster.publish({
                            eventType: "tweet",
                            tweetID: parsedTweet.tweetID,
                        })
                    } finally {
                        this.latch.decrement()
                    }
                }
            })
            await this.latch.join()
        }
    }

    async stop() {
        this.shouldStop = true
        this.proc?.kill()
        await this.latch.join()
        this.logger.debug("Twitter collector stopped successfully")
    }


}
