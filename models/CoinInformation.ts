import { U64 } from "aptos/src/generated";

export type CoinInformation = {
  symbol: string;
  name: string;
  decimals: number;
  total_supply: number;
  type: string;
  value: U64;
  balance?: U64
} & RawCoinInfo

export type TokenType = {
  type: string,
  account_address: string,
  module_name: string,
  struct_name: string,
}

export type ExtensionType = {
  data: [string, string][],
}

export type RawCoinInfo = {
  name: string,
  symbol: string,
  official_symbol: string,
  coingecko_id: string,
  decimals: number,
  logo_url: string,
  project_url: string,
  token_type: TokenType,
  extensions: ExtensionType,
  unique_index: number,
  source?: string,
  hippo_symbol?: string,
  pancake_symbol?: string,
  permissioned_listing?: boolean,
};

type RawJsonCoinInfo = {
  name: string,
  symbol: string,
  official_symbol: string,
  coingecko_id: string,
  decimals: number,
  logo_url: string,
  project_url: string,
  token_type: TokenType,
  extensions: {
    data: string[][]
  },
  source?: string,
  unique_index: number,
  hippo_symbol?: string,
  pancake_symbol?: string,
  permissioned_listing?: boolean,
};