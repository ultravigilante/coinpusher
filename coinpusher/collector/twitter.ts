import { Channel } from "@coinpusher/core/channel";
import axios from "axios";
import { Readable } from "node:stream"
import type { TweetContent, TwitterUser } from "@coinpusher/core/twitter/parse";
import env from "@coinpusher/env";
import { z } from "zod";
import { Logger } from "@coinpusher/core/logging";
import { ZeroLatch } from "@coinpusher/core/latch";
import { twitterHeaders } from "@coinpusher/core/twitter/constant";

const twitterRulesEndpointURL = "https://api.twitter.com/2/tweets/search/stream/rules"
const twitterStreamEndpointURL = "https://api.twitter.com/2/tweets/search/stream"

const minFollowerCountFragment = `followers_count:${env.collector.twitter.minFollowerCount}`
const onlyTweetFragment = "-is:retweet -is:reply"

const twitterRules = [
    { tag: "pumpURL", value: `(url:pump.fun OR url:www.pump.fun) ${minFollowerCountFragment} ${onlyTweetFragment}` },
    { tag: "dexScreenerURL", value: `(url:dexscreener.com/solana OR url:www.dexscreener.com/solana) ${minFollowerCountFragment} ${onlyTweetFragment}` },
]

export type Tweet = {
    content: TweetContent,
    author: TwitterUser,
    url: string
}

const TwitterAPIResponseSchema = z.object({
    data: z.array(z.any()).optional(),
    includes: z.object({
        users: z.array(z.any()),
    }).optional(),
})

export const tweetChannel = new Channel<Tweet>()
export class Collector {

    private shouldStop : boolean
    private latch : ZeroLatch
    private logger : Logger
    private abortController : AbortController
    private runPromise : Promise<void>

    constructor() {
        this.shouldStop = false
        this.latch = new ZeroLatch()
        this.logger = new Logger({ path: __filename })
        this.runPromise = this.run()
        this.abortController = new AbortController()
    }

    async run() {
        this.logger.debug("Setting filter rules for twitter stream")
        await axios.post(twitterRulesEndpointURL, {}, 
            { headers: twitterHeaders, params: { delete_all: true } }
        ).then(resp => console.log(resp.data))
        await axios.post(twitterRulesEndpointURL, 
            { add: twitterRules },
            { headers: twitterHeaders }
        ).then(resp => console.log(resp.data))
        
        while(!this.shouldStop) {
            this.logger.debug("Setting up twitter stream")
            const stream = await axios.get(twitterStreamEndpointURL, { 
                headers: twitterHeaders, 
                signal: this.abortController.signal,
                responseType: "stream",
            }).then(resp => resp.data) as Readable

            this.latch.increment()
            stream.on("close", () => this.latch.decrement())
            await this.latch.join()
        }

        this.logger.debug("Twitter stream closed as expected")
    }

    async stop() {
        this.shouldStop = true
        this.abortController.abort()
        await this.runPromise
        this.logger.debug("Twitter collector stopped successfully")
    }


}
