import axios from "axios";
import { Semaphore } from "./semaphore";

const discordHeaders = { "Accept-Encoding": "gzip" }
const concurrencySemaphore = new Semaphore(1)
const throttleMs = 1_500

export class DiscordNotifier {

    private webhookURL : string

    constructor(params : {
        webhookURL: string
    }) {
        this.webhookURL = params.webhookURL
    }

    async send(content : string) {
        await concurrencySemaphore.acquire()
        setTimeout(() => concurrencySemaphore.release(), throttleMs)
        await axios.post(this.webhookURL,
            { content },
            { headers : discordHeaders }
        ).catch(() => null)
    }
        
}