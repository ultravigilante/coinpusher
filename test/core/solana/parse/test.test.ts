import { expect, test } from "bun:test"
import { TransactionEventParser } from "@coinpusher/core/solana/parse"

import tx2ex9mw from "./data/2ex9my-raydium-cp-initialize.json"
import tx28FDVn from "./data/28FDVn-raydium-cp-initialize.json"
import tx3YWUfe from "./data/3YWUfe-raydium-cp-deposit.json"
import tx3iySYF from "./data/3iySYF-raydium-v4-initialize.json"
import tx5Jiq8i from "./data/5Jiq8i-raydium-v4-add-liquidity.json"
import tx5FpTSt from "./data/5FpTSt-raydium-v4-remove-liquidity.json"
import tx5LcDnN from "./data/5LcDnN-raydium-v4-swap-17-acc.json"
import tx3xvqEw from "./data/3xvqEw-raydium-v4-swap-18-acc.json"
import tx41Bg6X from "./data/41Bg6X-pump-buy.json"
import txrZSAoR from "./data/rZSAoR-pump-sell.json"

const parseTransaction = (data: any) => {
    return new TransactionEventParser().parse(data)
}

test("2ex9mw-raydium-cp-initialize.json", () => {
    const events = parseTransaction(tx2ex9mw)
    expect(events).toStrictEqual([{
            decimals: 9,
            eventType: "initializeMint",
            fromPump: false,
            hasFreezeAuthority: false,
            hasMintAuthority: true,
            mintAddress: "B6s9nTHf3uxWh1QGwxh5ZRHK762BENNq4j2FQvBGtcjR",
            transactionSignature: "2ex9my1v3L6Hm3ev3CcFoBxsi3EZ1DRXVBN17rMiE8aJjmbv8Nvw9VErNc3sJVcjBftXpiL8S6yHabMueiBSj2D7",
        }, {
            amount: "4668292721988",
            eventType: "mint",
            mintAddress: "B6s9nTHf3uxWh1QGwxh5ZRHK762BENNq4j2FQvBGtcjR",
            transactionSignature: "2ex9my1v3L6Hm3ev3CcFoBxsi3EZ1DRXVBN17rMiE8aJjmbv8Nvw9VErNc3sJVcjBftXpiL8S6yHabMueiBSj2D7",
        }, {
            eventType: "raydiumCPInitialize",
            liquidityTokenMintAddress: "B6s9nTHf3uxWh1QGwxh5ZRHK762BENNq4j2FQvBGtcjR",
            poolAddress: "aiNLkBXJdiK9zPqZowZMSo65JaTnBSyPmoETi86f9Uj",
            token0Amount: "85690954696",
            token0MintAddress: "So11111111111111111111111111111111111111112",
            token0VaultAddress: "9PHThJDsizYM931UcL3UrKwpxfZtr9hiTS8gHbPKax3F",
            token1Amount: "254320389082119",
            token1MintAddress: "97pcbfUzgSXH427N7iPxjgi18FXu7JEUSZgGvjJBxZFm",
            token1VaultAddress: "5TiM13cuyq6qBpHaADSu2QbzmzNQa8Xcf3hq2XQoarH5",
            transactionSignature: "2ex9my1v3L6Hm3ev3CcFoBxsi3EZ1DRXVBN17rMiE8aJjmbv8Nvw9VErNc3sJVcjBftXpiL8S6yHabMueiBSj2D7",
        }, {
            amount: "4668292721988",
            eventType: "burn",
            mintAddress: "B6s9nTHf3uxWh1QGwxh5ZRHK762BENNq4j2FQvBGtcjR",
            transactionSignature: "2ex9my1v3L6Hm3ev3CcFoBxsi3EZ1DRXVBN17rMiE8aJjmbv8Nvw9VErNc3sJVcjBftXpiL8S6yHabMueiBSj2D7",
        }
    ])
})

test("3YWUfe-raydium-cp-deposit", () => {
    const events = parseTransaction(tx3YWUfe)
    expect(events).toStrictEqual([
        {
            amount: "66627862783",
            eventType: "mint",
            mintAddress: "253mYftxAivB59jfCQTMYyL1WeXWrC7kh44JzhDMzTC6",
            transactionSignature: "3YWUfe2pQ5SmpKDR624SWc2yRA4GLkEMZDY5c8A9cG9Zd5jBDUL6a2wGeGKdFS8nEDy5SH1UAc2JQNvs6DA38mC2",
        },
        {
            eventType: "raydiumCPDeposit",
            poolAddress: "7TrQM2fDiH1HGF4yGD9yVekGXNH8mSi8tyZSrCG5paFc",
            token0Amount: "199000000",
            token1Amount: "22307899997944",
            transactionSignature: "3YWUfe2pQ5SmpKDR624SWc2yRA4GLkEMZDY5c8A9cG9Zd5jBDUL6a2wGeGKdFS8nEDy5SH1UAc2JQNvs6DA38mC2",
        }
    ])
})

test("3iySYF-raydium-v4-initialize", () => {
    const events = parseTransaction(tx3iySYF)
    expect(events).toStrictEqual([
        {
            decimals: 9,
            eventType: "initializeMint",
            fromPump: false,
            hasFreezeAuthority: false,
            hasMintAuthority: true,
            mintAddress: "Dc9YLQRvLezjonmjKshUjHd7Cta9td43dTXKNg3N6Z45",
            transactionSignature: "3iySYFy1UruWQ4siaHxPhbc8dWm5aPNPocJ1b99WrpfB7bRstfmRkRjby8CCanJmWbeDMe2nXLHa5fERVg2iBrMM",
        },
        {
            amount: "4042044497524",
            eventType: "mint",
            mintAddress: "Dc9YLQRvLezjonmjKshUjHd7Cta9td43dTXKNg3N6Z45",
            transactionSignature: "3iySYFy1UruWQ4siaHxPhbc8dWm5aPNPocJ1b99WrpfB7bRstfmRkRjby8CCanJmWbeDMe2nXLHa5fERVg2iBrMM",
        },
        {
            baseAmount: "79005359154",
            baseMintAddress: "So11111111111111111111111111111111111111112",
            eventType: "raydiumV4Initialize",
            liquidityTokenMintAddress: "Dc9YLQRvLezjonmjKshUjHd7Cta9td43dTXKNg3N6Z45",
            poolAddress: "HESQgfGdHxv8vHdJTdhKHFk5MAheXKavdDwz5PXEXPXa",
            quoteAmount: "206900000000000",
            quoteMintAddress: "9WJXYDyMPrrzKHkjqtm6WefritTxkw36kjgzC42JukpW",
            tokenBaseVaultAddress: "HsgXqLiVB9o5n3StpZLrUtvYkRrRMmfZTKe4diW6fBYc",
            tokenQuoteVaultAddress: "CYf26n17ygCQCc6DLCph4ftMZRPcjzeZp69fp6neaZ5v",
            transactionSignature: "3iySYFy1UruWQ4siaHxPhbc8dWm5aPNPocJ1b99WrpfB7bRstfmRkRjby8CCanJmWbeDMe2nXLHa5fERVg2iBrMM",
        }
    ])
})

test("5Jiq8i-raydium-v4-add-liquidity", () => {
    const events = parseTransaction(tx5Jiq8i)
    expect(events).toStrictEqual([
        {
            amount: "2605734184614",
            eventType: "mint",
            mintAddress: "CnYAD1JSdnkYfYHwt1FqmptVgQMz6sby5pUYGkFh7ukG",
            transactionSignature: "5Jiq8ih9HffyRu2xwkEpDKnAX8HH8nKjfbVUDsQfgq4vpQHpkiymY6LbbvzwP5cYSCuL8wbVgXyFoUoFtyiPUh8W",
        },
        {
            baseAmount: "2818202141226163",
            eventType: "raydiumV4AddLiquidity",
            poolAddress: "2Rcx3UBaDbNHVFnVBFx4AG7cxHksBanKpBASEhS6SF5F",
            quoteAmount: "2879474530",
            transactionSignature: "5Jiq8ih9HffyRu2xwkEpDKnAX8HH8nKjfbVUDsQfgq4vpQHpkiymY6LbbvzwP5cYSCuL8wbVgXyFoUoFtyiPUh8W",
        }
    ])
})

test("28FDVn-raydium-cp-initialize", () => {
    const events = parseTransaction(tx28FDVn)
    expect(events).toStrictEqual([
        {
            eventType: "initializeMint",
            hasFreezeAuthority: false,
            hasMintAuthority: true,
            transactionSignature: "28FDVns1NEqdi8tLirfwC7gNc1JknHbxYs23zbcLCn94j32YUdtTo7ZC842dpFbxHABpdZ8JaJfvkLEFDfZxHwJh",
            decimals: 9,
            fromPump: false,
            mintAddress: "5XL1KYFGaW3V8H6W5G9CSrr3Sz8kZTbxnzgPwq1wfzJL",
        }, {
            eventType: "mint",
            transactionSignature: "28FDVns1NEqdi8tLirfwC7gNc1JknHbxYs23zbcLCn94j32YUdtTo7ZC842dpFbxHABpdZ8JaJfvkLEFDfZxHwJh",
            mintAddress: "5XL1KYFGaW3V8H6W5G9CSrr3Sz8kZTbxnzgPwq1wfzJL",
            amount: "20493901531819",
        }, {
            transactionSignature: "28FDVns1NEqdi8tLirfwC7gNc1JknHbxYs23zbcLCn94j32YUdtTo7ZC842dpFbxHABpdZ8JaJfvkLEFDfZxHwJh",
            eventType: "raydiumCPInitialize",
            poolAddress: "AQGPHsNFfvwNULydEKQtEnwMAJJH1AGgHC2oHUHuFKhe",
            token0MintAddress: "So11111111111111111111111111111111111111112",
            token1MintAddress: "DeXRw2jRpVWEhXnM4BG9fjDkFxc7eQ17TPQWezegG9CS",
            token0VaultAddress: "CPAWXzbN4DUzbK87AKKNF65bUUUEoTT7ARSCPqsHg6wD",
            token1VaultAddress: "9tTQcXVHTcbg7qtLdnoJWaSCfotvrmwcNcRpuqFEDGFG",
            token0Amount: "20000000000",
            token1Amount: "21000000000000000",
            liquidityTokenMintAddress: "5XL1KYFGaW3V8H6W5G9CSrr3Sz8kZTbxnzgPwq1wfzJL",
        }
    ])
})

test("5FpTSt-raydium-v4-remove-liquidity", () => {
    const events = parseTransaction(tx5FpTSt)
    expect(events).toStrictEqual([
        {
            amount: "54771255750516",
            eventType: "burn",
            mintAddress: "FtnLjq2xHgXLxWAzyFKf5A6uGXqeGtvoxTdqinrNCejN",
            transactionSignature: "5FpTStPi1MUc5cSLz7NbaVZyhCBSKYPSLJApek18GNT39WYPNzDhbHUmJy5PZW3tvq2zA91ySzvwB4xqKWjcrRs4",
        },
        {
            baseAmount: "677727783814635188",
            eventType: "raydiumV4RemoveLiquidity",
            poolAddress: "5Ef8pmqAhi2L9DyvdoD2bJZBtZC9iFrnfC32g3cA9zFN",
            quoteAmount: "4431661203",
            transactionSignature: "5FpTStPi1MUc5cSLz7NbaVZyhCBSKYPSLJApek18GNT39WYPNzDhbHUmJy5PZW3tvq2zA91ySzvwB4xqKWjcrRs4",
        }
    ])
})

test("5LcDnN-raydium-v4-swap-17-acc", () => {
    const events = parseTransaction(tx5LcDnN)
    expect(events).toStrictEqual([
        {
            basePostBalance: "166890276120065149",
            eventType: "raydiumV4Swap",
            poolAddress: "3cPQaJqymFw9YsA839a95WgwfJC7tPxprBoEXD7qCkKj",
            quotePostBalance: "58302448768",
            transactionSignature: "5LcDnN7C8mDiraLkpSSMauDRtxizER51GmwXE4pWHtp7Lu1N3t2GkRZRPfvxU3EJT8S79CVYD7KALf3mn7spCrrc",
        }
    ])
}) 

test("3xvqEw-raydium-v4-swap-18-acc", () => {
    const events = parseTransaction(tx3xvqEw)
    expect(events).toStrictEqual([
        {
            basePostBalance: "477675767885588",
            eventType: "raydiumV4Swap",
            poolAddress: "BgV3bDqHHmaMBb7rgNXdmZ4CVMH6yETuBuQqQ8CJJMMo",
            quotePostBalance: "33876861",
            transactionSignature: "3xvqEw5oMg8emePV9oMG8MFDWStaQBXVdu3xRDbdpD1b4mKFA3dMZwU53D6d7jzfxJ4kgSKbZUExMUQaQw5c1xaa",
        }
    ])
}) 

test("41Bg6X-pump-buy", () => {
    const events = parseTransaction(tx41Bg6X)
    expect(events).toStrictEqual([
        {
            eventType: "pumpBuy",
            solAmount: 13244934n,
            tokenAmount: 364011419936n,
            tokenMint: "4R4CLQXsm2aHXc31CDDMsYwdYEqYB9aW6vfgobW2u1Cw",
            transactionSignature: "41Bg6X4oueyRN62YW2acqxNKjTRg6gn4wGz8b2hHTWUCtmyrxRqSfVEGz6zDA2cmeY9rcwUrfGtRKeNRFwY4BQAb",
        }
    ])
}) 

test("rZSAoR-pump-sell", () => {
    const events = parseTransaction(txrZSAoR)
    expect(events).toStrictEqual([
        {
            eventType: "pumpSell",
            solAmount: 702264256n,
            tokenAmount: 19274301000000n,
            tokenMint: "4R4CLQXsm2aHXc31CDDMsYwdYEqYB9aW6vfgobW2u1Cw",
            transactionSignature: "rZSAoR98CnGCymqShKcKT5d7HtPB2pSchE64f3ZXmy11x9NDTytNHhZ3m7DJ6uu6D9JhhUwMpXGXsnVQ8fRRpF8",
        }
    ])
})