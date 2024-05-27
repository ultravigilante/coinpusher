import { heliusRPCURL, walletKeyPair } from "@coinpusher/core/solana/constant"
import { SPL_ACCOUNT_LAYOUT, TOKEN_PROGRAM_ID, type TokenAccount } from "@raydium-io/raydium-sdk"

export class UserTokenAccountsFinder {

    async findUserAccounts() : Promise<TokenAccount[]> {
        const tokenAccounts = await heliusRPCURL.getTokenAccountsByOwner(
            walletKeyPair.publicKey,
            { programId: TOKEN_PROGRAM_ID },
            "processed"
        )

        return tokenAccounts.value.map(acc => ({
            pubkey: acc.pubkey,
            programId: acc.account.owner,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(acc.account.data)
        }))
    }
}