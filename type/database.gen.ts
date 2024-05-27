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

export interface ExtractorPumpTwitter {
  created_at: Generated<Timestamp>;
  follower_count: number;
  id: Generated<number>;
  solana_buy_amount: Generated<Numeric>;
  token_buy_amount: Generated<Numeric>;
  token_mint: string;
  tweet_url: string;
  variant: string;
}

export interface ExtractorShaxianRaydiumV4 {
  buy_solana_amount: Generated<Numeric>;
  buy_token_amount: Generated<Numeric>;
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  is_token_base: boolean;
  liquidity_burnt_at: Timestamp | null;
  pool_address: string;
  sell_solana_amount: Generated<Numeric>;
  sell_token_amount: Generated<Numeric>;
  variant: string;
}

export interface ExtractorShaxianRaydiumV4Trade {
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  shaxian_raydium_v4_id: number;
  transaction_signature: string;
}

export interface TweetScraperPumpMention {
  created_at: Timestamp;
  follower_count: number;
  id: Generated<number>;
  pump_mint_address: string;
  tweet_id: string;
  twitter_username: string;
}

export interface DB {
  "collector.raydium_v4": CollectorRaydiumV4;
  "collector.spl_token": CollectorSplToken;
  "extractor.pump_twitter": ExtractorPumpTwitter;
  "extractor.shaxian_raydium_v4": ExtractorShaxianRaydiumV4;
  "extractor.shaxian_raydium_v4_trade": ExtractorShaxianRaydiumV4Trade;
  "tweet_scraper.pump_mention": TweetScraperPumpMention;
}
