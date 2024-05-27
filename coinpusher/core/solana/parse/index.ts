import { BurnEventParser, type BurnEvent } from "./event/burn";
import { InitializeMintEventParser, type InitializeMintEvent } from "./event/initialize-mint";
import { MintEventParser, type MintEvent } from "./event/mint";
import { RemoveMintAuthorityEventParser, type RemoveMintAuthorityEvent } from "./event/remove-mint-authority";
import { RaydiumV4AddLiquidityEventParser, type RaydiumV4AddLiquidityEvent } from "./event/raydium-v4/add-liquidity";
import { RaydiumV4InitializeEventParser, type RaydiumV4InitializeEvent } from "./event/raydium-v4/initialize";
import { RaydiumCPInitializeEventParser, type RaydiumCPInitializeEvent } from "./event/raydium-cp/initialize";
import { RaydiumCPDepositEventParser, type RaydiumCPDepositEvent } from "./event/raydium-cp/deposit";
import { RemoveFreezeAuthorityEventParser, type RemoveFreezeAuthorityEvent } from "./event/remove-freeze-authority";
import { RaydiumV4RemoveLiquidityEventParser, type RaydiumV4RemoveLiquidityEvent } from "./event/raydium-v4/remove-liquidity";
import { RaydiumV4SwapEventParser, type RaydiumV4SwapEvent } from "./event/raydium-v4/swap";
import { TransactionParser, type TransactionInstruction, type Transaction } from "./transaction";
import { PumpBuyParser, type PumpBuyEvent } from "./event/pump/buy";
import { PumpSellParser, type PumpSellEvent } from "./event/pump/sell";

export type TransactionEvent =
    InitializeMintEvent |
    MintEvent |
    RemoveMintAuthorityEvent |
    RemoveFreezeAuthorityEvent |
    BurnEvent |
    RaydiumV4InitializeEvent |
    RaydiumV4RemoveLiquidityEvent |
    RaydiumV4AddLiquidityEvent |
    RaydiumV4SwapEvent |
    RaydiumCPInitializeEvent |
    RaydiumCPDepositEvent |
    PumpBuyEvent |
    PumpSellEvent

interface InternalTransactionEventParser {
    parse(params : {
        instruction: TransactionInstruction,
        transaction: Transaction
    }) : TransactionEvent | null
}

export class TransactionEventParser {
    eventParsers: InternalTransactionEventParser[]
    transactionParser : TransactionParser
    constructor() {
        this.transactionParser = new TransactionParser()
        this.eventParsers = [
            new InitializeMintEventParser(),
            new MintEventParser(),
            new RemoveMintAuthorityEventParser(),
            new RemoveFreezeAuthorityEventParser(),
            new BurnEventParser(),
            new RaydiumV4InitializeEventParser(),
            new RaydiumV4AddLiquidityEventParser(),
            new RaydiumV4RemoveLiquidityEventParser(),
            new RaydiumV4SwapEventParser(),
            new RaydiumCPInitializeEventParser(),
            new RaydiumCPDepositEventParser(),
            new PumpBuyParser(),
            new PumpSellParser()
        ]
    }

    private parseEventsForInstruction(params : {
        instruction : TransactionInstruction, 
        transaction : Transaction, 
        events : TransactionEvent[],
    }) {
        for(const innerInstruction of params.instruction.instructions) {
            this.parseEventsForInstruction({
                instruction: innerInstruction,
                transaction: params.transaction,
                events : params.events
            })

            if(innerInstruction === params.instruction) {
                throw new Error("Infinite loop detected")
            }
        }

        for(const parser of this.eventParsers) {
            const transactionEvent = parser.parse({
                instruction: params.instruction,
                transaction: params.transaction
            })
            if(transactionEvent !== null) {
                params.events.push(transactionEvent)
                return
            }
        }
    }

    parse(data : any) : TransactionEvent[] {
        const transaction = this.transactionParser.parse(data)
        if(!transaction) {
            return []
        }

        const events : TransactionEvent[] = []
        for(const instruction of transaction.instructions) {
            this.parseEventsForInstruction({
                instruction: instruction, 
                transaction : transaction,
                events: events
            })
        }
        return events
}

}

