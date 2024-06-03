import { twitterHeaders } from "@coinpusher/core/twitter/constant"
import axios from "axios"

const twitterUsageURL = "https://api.twitter.com/2/usage/tweets"

await axios.get(twitterUsageURL, 
    { headers: twitterHeaders }
).then(resp => console.log(resp.data))