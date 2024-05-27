import { z } from "zod"

export const TwitterUserDataSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    public_metrics: z.object({
        followers_count: z.number(),
        following_count: z.number(),
    }),
})

export const TweetDataSchema = z.object({
    author_id: z.string(),
    text: z.string(),
    id: z.string(),
    created_at: z.string(),
    entities: z.object({
        urls: z.array(z.object({
            expanded_url: z.string().url(),
        })),
    })
})
