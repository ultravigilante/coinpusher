import type { TweetCollectedEvent } from "./collector/twitter";
import { Channel } from "./core/channel";
import type { CollectorEvent as SolanaCollectorEvent } from "./collector/solana";

export type BroadastEvent = 
    TweetCollectedEvent |
    SolanaCollectorEvent

export const broadcaster = new Channel<BroadastEvent>()