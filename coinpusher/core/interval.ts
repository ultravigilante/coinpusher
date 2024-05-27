import { ZeroLatch } from "./latch"

export class Interval {

    private repeatIntervalMs: number
    private repeatFn: () => Promise<void>
    private timer : Timer
    private latch : ZeroLatch
    private shouldStop : boolean

    constructor(params: {
        repeatIntervalMs: number,
        repeatFn: () => Promise<void>
    }) {
        this.repeatIntervalMs = params.repeatIntervalMs
        this.shouldStop = false
        this.repeatFn = params.repeatFn
        this.latch = new ZeroLatch(1)
        this.timer = setInterval(() => this.run(), this.repeatIntervalMs)
    }

    private async run() {
        try {
            this.latch.increment()
            await this.repeatFn()
        } finally {
            this.latch.decrement()
        }
    }

    async stop() {
        if(!this.shouldStop) {
            this.shouldStop = true
            this.latch.decrement()
            clearInterval(this.timer)
        }

        await this.latch.join()
    }

    async join() {
        await this.latch.join()
    }

}