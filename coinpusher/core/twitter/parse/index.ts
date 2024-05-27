import { TweetDataSchema, TwitterUserDataSchema } from "./schema"

export type TweetContent = {
    tweetID: string
    authorID: string
    text: string
    createdAt: string
    urls: string[]
}

export type TwitterUser = {
    userID: string
    name: string
    username: string
    followerCount: number
    followingCount: number
}

export class TweetContentParser {
    parse(data : any) : TweetContent | null {
        const parsedData = TweetDataSchema.safeParse(data)
        if(!parsedData.success) {
            return null
        }

        return {
            tweetID: parsedData.data.id,
            authorID: parsedData.data.author_id,
            text: parsedData.data.text,
            createdAt: parsedData.data.created_at,
            urls: parsedData.data.entities.urls.map((d : any) => d.expanded_url) || []
        }

    }
}

export class TwitterUserParser {
    parse(data : any) : TwitterUser | null {
        const parsedData = TwitterUserDataSchema.safeParse(data)
        if(!parsedData.success) {
            return null
        }

        return {
            userID: parsedData.data.id,
            name: parsedData.data.name,
            username: parsedData.data.username,
            followerCount: parsedData.data.public_metrics.followers_count,
            followingCount: parsedData.data.public_metrics.following_count,
        }
        
    }
}