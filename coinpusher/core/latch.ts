type PromiseResolveFn = (arg?: any) => void

export class ZeroLatch {

    private count : number
    private queue : PromiseResolveFn[]

    constructor(initialCount = 0) {
        this.queue = []
        this.count = initialCount
    }

    increment() {
        this.count += 1
    }

    decrement() {
        if(this.count > 0) {
            this.count -= 1
        }

        if(this.count === 0) {
            for(const resolve of this.queue) {
                resolve()
            }
        }
    }

    async join() {
        if(this.count > 0) {
            await new Promise(resolve => {
                this.queue.push(resolve)
            })
        }
    }

}