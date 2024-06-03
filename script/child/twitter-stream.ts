import env from "@coinpusher/env"
import { send } from "process"
import axios from "axios"

const twitterRulesEndpointURL = "https://api.twitter.com/2/tweets/search/stream/rules"
const twitterStreamEndpointURL = "https://api.twitter.com/2/tweets/search/stream"
import { twitterHeaders } from "@coinpusher/core/twitter/constant";
import type { Readable } from "stream";

const searchParams = {
    "expansions": "author_id",
    "user.fields": "public_metrics",
    "tweet.fields": "created_at,entities,text",
}

const minFollowerCountFragment = `followers_count:${env.collector.twitter.minFollowerCount}`
const onlyTweetFragment = "-is:retweet -is:reply"
const twitterRules = [
    { tag: "pumpURL", value: `(url:pump.fun OR url:www.pump.fun) ${minFollowerCountFragment} ${onlyTweetFragment}` },
    { tag: "dexScreenerURL", value: `(url:dexscreener.com/solana OR url:www.dexscreener.com/solana) ${minFollowerCountFragment} ${onlyTweetFragment}` },
]

await axios.post(twitterRulesEndpointURL, {}, 
    { headers: twitterHeaders, params: { delete_all: true } }
)

await axios.post(twitterRulesEndpointURL, 
    { add: twitterRules },
    { headers: twitterHeaders }
)

const stream = await axios.get(twitterStreamEndpointURL, { 
    headers: twitterHeaders, 
    responseType: "stream",
    params: searchParams
}).then(resp => resp.data) as Readable

stream.on("data", (data : Buffer) => {
    console.log(data.toString())
    if(send) {
        send(data.toString())
    }
})