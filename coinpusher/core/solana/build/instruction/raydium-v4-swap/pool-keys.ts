import { PublicKey } from "@solana/web3.js"
import { type RaydiumPoolAccount } from "./pool-account"
import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity, MARKET_STATE_LAYOUT_V3, Market, type LiquidityPoolKeys } from "@raydium-io/raydium-sdk"
import { heliusRPCURL, raydiumV4ProgramAddress } from "@coinpusher/core/solana/constant"

export class RaydiumPoolKeysGenerator {

    async generatePoolKeys(poolAccount : RaydiumPoolAccount) : Promise<LiquidityPoolKeys|null> {
        const decodedProgramData = LIQUIDITY_STATE_LAYOUT_V4.decode(poolAccount.account.data)

        const market = await heliusRPCURL.getAccountInfo(decodedProgramData.marketId, "processed")
        if(market === null) {
            return null
        }

        const decodedMarketData = MARKET_STATE_LAYOUT_V3.decode(market.data)

        const authority = Liquidity.getAssociatedAuthority({
            programId: raydiumV4ProgramAddress
        }).publicKey

        const marketAuthority = Market.getAssociatedAuthority({
            programId: market.owner,
            marketId: decodedMarketData.ownAddress
        }).publicKey

        return {
            id: new PublicKey(poolAccount.publicKey),
            baseMint: decodedProgramData.baseMint,
            quoteMint: decodedProgramData.quoteMint,
            lpMint: decodedProgramData.lpMint,
            baseDecimals: decodedProgramData.baseDecimal.toNumber(),
            quoteDecimals: decodedProgramData.quoteDecimal.toNumber(),
            lpDecimals: decodedProgramData.baseDecimal.toNumber(),
            version: 4,
            programId: raydiumV4ProgramAddress,
            openOrders: decodedProgramData.openOrders,
            targetOrders: decodedProgramData.targetOrders,
            baseVault: decodedProgramData.baseVault,
            quoteVault: decodedProgramData.quoteVault,
            marketVersion: 3,
            authority: authority,
            marketProgramId: market.owner,
            marketId: decodedMarketData.ownAddress,
            marketAuthority: marketAuthority,
            marketBaseVault: decodedMarketData.baseVault,
            marketQuoteVault: decodedMarketData.quoteVault,
            marketBids: decodedMarketData.bids,
            marketAsks: decodedMarketData.asks,
            marketEventQueue: decodedMarketData.eventQueue,
            withdrawQueue: decodedProgramData.withdrawQueue,
            lpVault: decodedProgramData.lpVault,
            lookupTableAccount: PublicKey.default
        }
    }
}