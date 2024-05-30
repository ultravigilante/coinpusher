import { z } from "zod";
import env from "../env.json"
import { SerializedBigInt } from "./core/schema";

export default z.object({
    core: z.object({
        databaseURL: z.string().url(),
        logLevel: z.enum(["debug", "info", "warn", "error"]),
        solana: z.object({
            heliusAPIKey: z.string(),
            walletSecretKey: z.string(),
        })
    }),

    origin: z.object({
        twitter: z.object({
            twitterAPIKey: z.string()
        }),
    }),

    collector: z.object({
        solana: z.object({
            eventBatchSize: z.number(),
        }),
    }),

    extractor: z.object({
        pumpTweet: z.object({
            discordNotificationWebhookURL: z.string().url(),
            variants: z.array(z.object({
                variant: z.string(),
                buyAmount: SerializedBigInt,
                maxBuyAmount: SerializedBigInt,
                minFollowerCount: z.number(),
                feeScaler: z.number(),
            }))
        })
    })

}).parse(env)