import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Numeric = ColumnType<string, number | string, number | string>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface CollectorRaydiumV4 {
  created_at: Generated<Timestamp>;
  emitted_at: Timestamp | null;
  id: Generated<number>;
  liquidity_token_mint_address: string;
  pool_address: string;
  token_base_added_amount: Numeric;
  token_base_amount: Numeric;
  token_base_mint_address: string;
  token_base_removed_amount: Numeric;
  token_base_vault_address: string;
  token_quote_added_amount: Numeric;
  token_quote_amount: Numeric;
  token_quote_mint_address: string;
  token_quote_removed_amount: Numeric;
  token_quote_vault_address: string;
  updated_at: Generated<Timestamp>;
}

export interface CollectorSplToken {
  burnt_amount: Numeric;
  created_at: Generated<Timestamp>;
  decimals: number;
  emitted_at: Timestamp | null;
  has_freeze_authority: boolean;
  has_mint_authority: boolean;
  id: Generated<number>;
  is_from_pump: boolean;
  mint_address: string;
  minted_amount: Numeric;
  updated_at: Generated<Timestamp>;
}

export interface CollectorTweet {
  created_at: Generated<Timestamp>;
  follower_count: number;
  following_count: number;
  id: Generated<number>;
  text: string;
  twitter_author_id: string;
  twitter_id: string;
  username: string;
}

export interface CollectorTweetDexscreenerPoolAddress {
  id: Generated<number>;
  pool_address: string;
  tweet_id: number;
}

export interface CollectorTweetPumpTokenMintAddress {
  id: Generated<number>;
  token_mint_address: string;
  tweet_id: number;
}

export interface TradePump {
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  name: string;
  solana_buy_amount: Generated<Numeric>;
  token_buy_amount: Generated<Numeric>;
  token_mint_address: string;
}

export interface TradeRaydium {
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  is_target_base: boolean;
  name: string;
  pool_address: string;
  solana_buy_amount: Generated<Numeric>;
  token_buy_amount: Generated<Numeric>;
}

export interface DB {
  "collector.raydium_v4": CollectorRaydiumV4;
  "collector.spl_token": CollectorSplToken;
  "collector.tweet": CollectorTweet;
  "collector.tweet_dexscreener_pool_address": CollectorTweetDexscreenerPoolAddress;
  "collector.tweet_pump_token_mint_address": CollectorTweetPumpTokenMintAddress;
  "trade.pump": TradePump;
  "trade.raydium": TradeRaydium;
}
