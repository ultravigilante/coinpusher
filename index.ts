import { database } from "@coinpusher/core/database"
import { ZeroLatch } from "@coinpusher/core/latch"

import { Collector as TwitterCollector } from "@coinpusher/collector/twitter"
import { Collector as SolanaCollector } from "@coinpusher/collector/solana"
import { Extractor as AldonnaExtractor } from "@coinpusher/extractor/aldonna"
import { Extractor as OomBarapExtractor } from "@coinpusher/extractor/oom-barap"
import { Extractor as SkibidiExtractor } from "@coinpusher/extractor/skibidi"

interface RunTime {
    stop : () => Promise<void>
}

const run = async () => {
    const runTimes : RunTime[] = [
        new TwitterCollector(),
        new SolanaCollector(),
        new AldonnaExtractor(),
        new OomBarapExtractor(),
        new SkibidiExtractor()
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