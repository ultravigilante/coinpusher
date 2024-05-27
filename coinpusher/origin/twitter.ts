import { Channel } from "@coinpusher/core/channel";
import { ZeroLatch } from "@coinpusher/core/latch";
import { Logger } from "@coinpusher/core/logging";
import { TweetContentParser, TwitterUserParser, type TweetContent, type TwitterUser } from "@coinpusher/core/twitter/parse";
import env from "@coinpusher/env";
import axios from "axios";
import { z } from "zod";

const searchTwitterAPIURL = "https://api.twitter.com/2/tweets/search/recent";
const repeatIntervalMs = 60_000
const startTimeRewindMs = 5 * 60 * 1000
const twitterHeaders = {
    "Authorization": `Bearer ${env.origin.twitter.twitterAPIKey}`,
    "Accept-Encoding": "gzip"
}

const filterString = "(url:pump.fun OR url:www.pump.fun) is:verified -is:retweet -is:reply -is:quote"
const maxResults = 10

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
});

export const tweetChannel = new Channel<Tweet>()

export class TwitterOrigin {
    private latch : ZeroLatch
    private intervalTimer : Timer
    private lastTweetID : string | null
    private logger : Logger

    constructor() {
        this.latch = new ZeroLatch();
        this.logger = new Logger({ path: __filename })
        this.lastTweetID = null;
        this.intervalTimer = setInterval(() => {
            this.latch.increment();
            this.run()
        }, repeatIntervalMs)
    }

    generateQuery() {
        const startTime = new Date(Date.now() - startTimeRewindMs)
        return {
            "query": filterString,
            "expansions": "author_id",
            "user.fields": "public_metrics",
            "tweet.fields": "created_at,entities,text",
            "since_id": this.lastTweetID ? this.lastTweetID : undefined,
            "max_results": maxResults,
            "start_time": this.lastTweetID ? undefined : startTime.toISOString().slice(0, 19) + "Z"
        }
    }


    private async run() {
        try {
            let data : any
            try {
                this.logger.debug("Fetching data from Twitter API")
                data = await axios.get(searchTwitterAPIURL, {
                    headers: twitterHeaders,
                    params: this.generateQuery()
                })
                .then(response => response.data)
            } catch (err) {
                this.logger.warn(`Failed to fetch data from Twitter API: ${err}`)
                return
            }

            const parsed = TwitterAPIResponseSchema.safeParse(data)
            if(!parsed.success) {
                this.logger.warn(`Failed to parse Twitter API response: ${parsed.error}`)
                return
            }

            const tweetDataList = parsed.data.data || []
            const userDataList = parsed.data.includes?.users || []
            const userLookup = new Map<string, TwitterUser>()

            for(const userData of userDataList) {
                const parsedUser = new TwitterUserParser().parse(userData)
                if(!parsedUser) {
                    this.logger.warn(`Failed to parse twitter user data: ${JSON.stringify(userData)}`)
                    continue
                }
                userLookup.set(parsedUser.userID, parsedUser)
            }

            for(const tweetData of tweetDataList) {
                const parsedTweet = new TweetContentParser().parse(tweetData)
                if(!parsedTweet) {
                    this.logger.warn(`Failed to parse tweet data: ${JSON.stringify(tweetData)}`)
                    continue
                }

                const user = userLookup.get(parsedTweet.authorID)
                if(!user) {
                    this.logger.warn(`Failed to find user for tweet: ${JSON.stringify(parsedTweet)}`)
                    continue
                }

                tweetChannel.publish({
                    content: parsedTweet,
                    author: user,
                    url: `https://twitter.com/${user.username}/status/${parsedTweet.tweetID}`
                })

                this.lastTweetID = this.lastTweetID === null || this.lastTweetID < parsedTweet.tweetID 
                    ? parsedTweet.tweetID 
                    : this.lastTweetID
            }
        } finally {
            this.latch.decrement();
        }
    }

    async stop() {
        clearInterval(this.intervalTimer)
        await this.latch.join();
    }
}