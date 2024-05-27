export type UnsubscribeFn = () => void
export type MessageHandler<T> = (message : T) => void

export class Channel<T> {
    subscribers : { [key : number] : MessageHandler<T>}
    uniqueIDGenerator : number

    constructor() {
        this.uniqueIDGenerator = 0
        this.subscribers = { }
    }

    private getUniqueID() {
        const toReturn = this.uniqueIDGenerator
        this.uniqueIDGenerator += 1
        return toReturn
    }

    subscribe(handler : MessageHandler<T>) : UnsubscribeFn {
        const uniqueID = this.getUniqueID()
        this.subscribers[uniqueID] = handler
        return () => this.unsubscribe(uniqueID)

    }

    unsubscribe(uniqueID : number) {
        delete this.subscribers[uniqueID]
    }

    publish(value : T) {
        for(const subscriber of Object.values(this.subscribers)) {
            subscriber(value)
        }
    }
}