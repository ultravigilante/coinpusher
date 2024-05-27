import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js"
import { decode } from "bs58"
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token"
import axios from "axios"
import { BondingCurveLayout, BuyInstructionLayout, GlobalAccountLayout, type BondingCurve } from "./layout"
import type { Optional } from "@coinpusher/core/optional"
import { heliusRPCURL, pumpGlobalAccountAddress, pumpProgramAddress, rentProgramAddress, walletKeyPair } from "@coinpusher/core/solana/constant"

export type PumpBuyInstructionBuildError = 
    { errorType : "pump-api-request-failed" } |
    { errorType : "pump-api-response-malformed" } |
    { errorType : "bonding-curve-data-missing" }

const pumpFeeScaler = 100
const buyInstructionIdentifier = Buffer.from("66063d1201daebea", "hex")
const pumpHostname = "https://client-api-2-74b1891ee9f9.herokuapp.com"

const pumpGlobalAccountData = GlobalAccountLayout.decode(decode(
 "3Q9SSYuBGfDGZwsjmP6vZ4W32kW2pPP6vEUqt65yzv2L5QhcRHJZto6F2vdYDPjvRFpSi4qJhTdhXkyxUCux7Qa67NhAieLsycdMBKBbw2vim8wCXZi98WA6nnfYWyJBHW5hrSUteeZzyTPvEZ2DKV6wuTD"
), 8)

const pumpAPIHeaders =  { "Accept-Encoding": "gzip" }
export class PumpBuyInstructionBuilder {

    private calculateBuyAmount(
        solAmount: bigint,
        curve: BondingCurve
    ): bigint {
        const { virtualSolReserves, virtualTokenReserves } = curve
        const invariant = virtualSolReserves * virtualTokenReserves
        const newVirtualSolReserves = virtualSolReserves + solAmount
        const newVirtualTokenReserves = invariant / newVirtualSolReserves
        return virtualTokenReserves - newVirtualTokenReserves
    }

    async build(params : {
        tokenMint: PublicKey
        solanaAmount : bigint
        maxSolanaAmount: bigint
    }): Promise<Optional<TransactionInstruction[],PumpBuyInstructionBuildError>> {

        let responseData : any
        try {
            responseData = await axios.get(`${pumpHostname}/coins/${params.tokenMint.toString()}`, { 
                    headers: pumpAPIHeaders
            }).then(response => response.data)
        } catch (err) {
            return {
                isSuccess: false,
                error: { errorType: "pump-api-request-failed" }
            }
        }

        let bondingCurve : PublicKey
        let associatedBondingCurve : PublicKey
        try {
            bondingCurve = new PublicKey(responseData.bonding_curve)
            associatedBondingCurve = new PublicKey(responseData.associated_bonding_curve)
        } catch (err) {
            return {
                isSuccess: false,
                error: { errorType: "pump-api-response-malformed" }
            }
        }

        const associatedTokenAddress = getAssociatedTokenAddressSync(
            params.tokenMint,
            walletKeyPair.publicKey
        )

        const [eventAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("__event_authority")],
            pumpProgramAddress
        )

        const bondingCurveData = await heliusRPCURL.getAccountInfo(bondingCurve)
        if (!bondingCurveData) {
            return {
                isSuccess: false,
                error: { errorType: "bonding-curve-data-missing" }
            }
        }

        const curveInfo = BondingCurveLayout.decode(bondingCurveData.data, 8)
        const pumpFeeAmount = params.solanaAmount / BigInt(pumpFeeScaler)
        const netSolanaAmount = params.solanaAmount - pumpFeeAmount
        const amount = this.calculateBuyAmount(netSolanaAmount, curveInfo)

        const instructions : TransactionInstruction[] = []

        const associatedTokenAccountInfo = await heliusRPCURL.getAccountInfo(associatedTokenAddress, "processed")
        if (!associatedTokenAccountInfo) {
            const createAssociatedAccountInfoInstruction = createAssociatedTokenAccountInstruction(
                walletKeyPair.publicKey,
                associatedTokenAddress,
                walletKeyPair.publicKey,
                params.tokenMint
            )
            instructions.push(createAssociatedAccountInfoInstruction)
        }

        const data = Buffer.alloc(BuyInstructionLayout.span)
        BuyInstructionLayout.encode(
            { 
                instruction: buyInstructionIdentifier, 
                amount: amount, 
                maxSolCost: params.maxSolanaAmount 
            },
            data
        )

        const keys = [
            { pubkey: pumpGlobalAccountAddress, isSigner: false, isWritable: false },
            { pubkey: pumpGlobalAccountData.feeRecipient, isSigner: false, isWritable: true },
            { pubkey: params.tokenMint, isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
            { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
            { pubkey: walletKeyPair.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: rentProgramAddress, isSigner: false, isWritable: false },
            { pubkey: eventAuthority, isSigner: false, isWritable: false },
            { pubkey: bondingCurveData.owner, isSigner: false, isWritable: false }
        ]

        instructions.push(new TransactionInstruction({
            keys: keys,
            programId: pumpProgramAddress,
            data: data
        }))

        return {
            isSuccess: true,
            value: instructions
        }
    }
}
