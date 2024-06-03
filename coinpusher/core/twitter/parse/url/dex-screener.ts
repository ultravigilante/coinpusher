import { URL } from "url";

const validHostnames = [
    "www.dexscreener.com",
    "dexscreener.com"
]

export class DexScreenerURLPoolAddressParser {
    parse(url : string) {
        // Add protocol if missing
        if(!url.startsWith("http")) {
            url = `https://${url}`
        }

        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch(e) {
            return null
        }

        if(!validHostnames.includes(parsed.hostname)) {
            return null
        }

        const match = parsed.pathname.match(/\/solana\/([A-Za-z0-9]{44})/)
        return match ? match[1] : null
    }
}
