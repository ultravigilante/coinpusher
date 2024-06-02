import { database } from "@coinpusher/core/database"
import { ZeroLatch } from "@coinpusher/core/latch"

import { Collector as TwitterCollector } from "./collector/twitter"


interface RunTime {
    stop : () => Promise<void>
}

const run = async () => {
    const runTimes : RunTime[] = [
        new TwitterCollector()
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