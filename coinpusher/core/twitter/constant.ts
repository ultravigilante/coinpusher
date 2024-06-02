import env from "@coinpusher/env";

export const twitterHeaders = {
    "Authorization": `Bearer ${env.core.twitter.bearerToken}`,
    "Accept-Encoding": "gzip"
}