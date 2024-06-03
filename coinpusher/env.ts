import { z } from "zod";
import env from "../env.json"
import { SerializedBigInt } from "./core/schema";

const TwitterPumpExtractorSchema = z.object({
    extractorType : z.literal("twitterPump"),
    discordNotificationWebhookURL: z.string().url(),
    variant: z.string(),
    buyAmount: SerializedBigInt,
    maxBuyAmount: SerializedBigInt,
    minFollowerCount: z.number(),
    feeScaler: z.number(),
})

const TwitterRaydiumExtractorSchema = z.object({
    extractorType : z.literal("twitterRaydium"),
    discordNotificationWebhookURL: z.string().url(),
    variant: z.string(),
    buyAmount: SerializedBigInt,
    minFollowerCount: z.number(),
    jitoTip: SerializedBigInt
})

export default z.object({
    core: z.object({
        databaseURL: z.string().url(),
        logLevel: z.enum(["debug", "info", "warn", "error"]),
        solana: z.object({
            heliusAPIKey: z.string(),
            walletSecretKey: z.string(),
        }),
        twitter: z.object({
            bearerToken: z.string(),
        })
    }),

    collector: z.object({
        twitter: z.object({
            minFollowerCount: z.number()
        }),
        solana: z.object({
            eventBatchSize: z.number(),
        }),
    }),

    extractor: z.object({
        discordNotificationWebhookURL: z.string().url(), 
        active: z.array(z.string())
    })
}).parse(env)