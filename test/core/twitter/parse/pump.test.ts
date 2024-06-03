import { PumpURLTokenMintAddressParser } from "@coinpusher/core/twitter/parse/url/pump"
import { expect, test } from "bun:test"


test("pump address parsing", () => {

    const parser = new PumpURLTokenMintAddressParser()

    const noWWW = "https://pump.fun/HHwkgd823Fe3Md2u1ToNBDV1NvMztMmvjowoqsALMSvL"
    expect(parser.parse(noWWW)).toBe("HHwkgd823Fe3Md2u1ToNBDV1NvMztMmvjowoqsALMSvL")

    const hasWWW = "https://www.pump.fun/HHwkgd823Fe3Md2u1ToNBDV1NvMztMmvjowoqsALMSvL"
    expect(parser.parse(noWWW)).toBe("HHwkgd823Fe3Md2u1ToNBDV1NvMztMmvjowoqsALMSvL")

    const noProto = "pump.fun/HHwkgd823Fe3Md2u1ToNBDV1NvMztMmvjowoqsALMSvL"
    expect(parser.parse(noProto)).toBe("HHwkgd823Fe3Md2u1ToNBDV1NvMztMmvjowoqsALMSvL")

})