import { DexScreenerURLPoolAddressParser } from "@coinpusher/core/twitter/parse/url/dex-screener"
import { expect, test } from "bun:test"


test("dex-screener address parsing", () => {

    const parser = new DexScreenerURLPoolAddressParser()

    const noWWW = "https://dexscreener.com/solana/2rcx3ubadbnhvfnvbfx4ag7cxhksbankpbasehs6sf5f"
    expect(parser.parse(noWWW)).toBe("2rcx3ubadbnhvfnvbfx4ag7cxhksbankpbasehs6sf5f")

    const hasWWW = "https://www.dexscreener.com/solana/2rcx3ubadbnhvfnvbfx4ag7cxhksbankpbasehs6sf5f"
    expect(parser.parse(hasWWW)).toBe("2rcx3ubadbnhvfnvbfx4ag7cxhksbankpbasehs6sf5f")

    const noProto = "www.dexscreener.com/solana/2rcx3ubadbnhvfnvbfx4ag7cxhksbankpbasehs6sf5f"
    expect(parser.parse(noProto)).toBe("2rcx3ubadbnhvfnvbfx4ag7cxhksbankpbasehs6sf5f")

})