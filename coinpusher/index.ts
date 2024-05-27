import { database } from "@coinpusher/core/database"
import { ZeroLatch } from "@coinpusher/core/latch"

import { Collector as SolanaCollector } from "./collector/solana"
import { Origin as SolanaOrigin } from "./origin/solana"
import { TwitterOrigin } from "./origin/twitter"
import { PumpTwitterExtractor } from "./extractor/pump-twitter"
import env from "./env"

interface RunTime {
    stop : () => Promise<void>
}

const run = async () => {
    const runTimes : RunTime[] = [
        //new SolanaOrigin(),

        new TwitterOrigin(),

        //new SolanaCollector(),

        ...env.extractor.pumpTweet.variants.map(v => new PumpTwitterExtractor(v))
    ]

    const latch = new ZeroLatch(1)
    process.on("SIGINT", () => latch.decrement())
    process.on("SIGTERM", () => latch.decrement())

    try {
        await latch.join()
        await Promise.all(runTimes.map(d => d.stop()))
    } finally {
        await database.destroy()
    }
}

run()