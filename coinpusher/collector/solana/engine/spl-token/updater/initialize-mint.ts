import { database } from "@coinpusher/core/database"
import { Logger } from "@coinpusher/core/logging"
import type { InitializeMintEvent } from "@coinpusher/core/solana/parse/event/initialize-mint"

export class InitializeMintEventUpdater {
    private logger: Logger

    constructor() {
        this.logger = new Logger({ path: __filename })
    }

    async update(events: InitializeMintEvent[]) {
        for(const event of events) {
            if(event.eventType != "initializeMint") {
                continue
            }

            this.logger.debug(`Received event: ${event.eventType}. Initializing token: ${event.mintAddress} (transaction: ${event.transactionSignature})`)
            await database
                .insertInto("collector.spl_token")
                .values({
                    mint_address: event.mintAddress,
                    decimals: event.decimals,
                    has_mint_authority: event.hasMintAuthority,
                    has_freeze_authority: event.hasFreezeAuthority,
                    minted_amount: 0,
                    burnt_amount: 0,
                    is_from_pump: event.fromPump
                })
                .execute()
        }
    }
}