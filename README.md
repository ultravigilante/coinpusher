
# Coin Pusher

<div align="center">
    <img src="logo.png" width="512px" width="512px">
</div>

## Setup

  1. Install dependencies using: `bun install`
  2. Create an `env.json` that confirms to the `zod` schema defined in: `coinpusher/env.ts`
  3. Migrate using: `bun run migrate`
  4. Generate DB types using: `bun run codegen`
  5. Run using `bun run index.ts`

## Extractors

  - `Aldonna` : Transacts on tokens using the pump.fun smart contract conditional on high follower twitter accounts referencing the relevant pump.fun token in a URL.
  - `OomBarap` : Transacts on tokens using the Raydium V4 smart contract conditional on high follower twitter accounts referencing the token. This will look at both DexScreener URLs *and* pump.fun URLs.
  - `Skibidi` : Transacts on raydium V4 deploys that have high + burnt liquidity, a high proportion of deployed tokens vs. minted supply and no freeze/mint authority.