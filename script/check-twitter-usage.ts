import { twitterHeaders } from "@coinpusher/core/twitter/constant"
import env from "@coinpusher/env"
import axios from "axios"

const twitterUsageURL = "https://api.twitter.com/2/usage/tweets"
const rulesURL = "https://api.twitter.com/2/tweets/search/stream/rules"

await axios.get(twitterUsageURL, 
    { headers: twitterHeaders }
).then(resp => console.log(resp.data))

await axios.get(rulesURL, 
    { headers: twitterHeaders }
).then(resp => console.log(resp.data))