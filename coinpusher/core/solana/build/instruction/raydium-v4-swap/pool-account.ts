import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import { PublicKey, type AccountInfo, type GetProgramAccountsFilter } from "@solana/web3.js";
import { heliusRPCURL, raydiumV4ProgramAddress } from "@coinpusher/core/solana/constant";

export type RaydiumPoolAccount = {
    account: AccountInfo<Buffer>;
    publicKey: PublicKey;
}

export class RaydiumPoolAccountFinder {

    private buildProgramAccountsFilters(params : {
        poolAddress: PublicKey,
    }) : GetProgramAccountsFilter[] { 
        return [
            { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
            { memcmp: { 
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("marketId"), 
                bytes: params.poolAddress.toBase58()
            } },
        ]
    }

    async findRaydiumPoolProgramAccount (params : {
        poolAddress: PublicKey,
    }) : Promise<RaydiumPoolAccount|null> {
        const results = await heliusRPCURL.getProgramAccounts(
            raydiumV4ProgramAddress, {
                filters: this.buildProgramAccountsFilters({
                    poolAddress: params.poolAddress
                }),
                commitment: "processed"
            },
        )

        if(results.length !== 1) {
            return null
        }

        return {
            account: results[0].account,
            publicKey: results[0].pubkey
        }
    }
}