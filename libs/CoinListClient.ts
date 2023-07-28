import { PERMISSIONED_LIST, PERMISSIONLESS_LIST, DEFAULT_TESTNET_LIST, RawCoinInfo } from "./TokenList";
import fetch from 'cross-fetch';



export type NetworkType = 'testnet' | 'mainnet';

export class CoinListClient {
  fullnameToCoinInfo: Record<string, RawCoinInfo>;
  indexToCoinInfo: Map<number, RawCoinInfo>;
  symbolToCoinInfo: Record<string, RawCoinInfo[]>;
  private coinList: RawCoinInfo[];
  private isUpdated: boolean
  private manifestUrl: string;

  constructor(
    public readonly permissioned: boolean,
    public readonly network: NetworkType = 'mainnet',
    list: RawCoinInfo[] | undefined = undefined
  ) {
    this.fullnameToCoinInfo = {};
    this.indexToCoinInfo = new Map();
    this.symbolToCoinInfo = {};
    this.isUpdated = false;
    this.manifestUrl = PERMISSIONED_LIST;
    this.coinList = [];
    if (list) {
      this.coinList = list
    } else {
      this.manifestUrl = network === 'mainnet' ? (permissioned ? PERMISSIONED_LIST : PERMISSIONLESS_LIST) : DEFAULT_TESTNET_LIST;
      this.updateDirect()
    }
    this.buildCache();
  }

  getCoinInfoList() {
    return this.coinList.concat([]).sort((a, b) => (a.unique_index || 0) - (b.unique_index || 0));
  }

  getCoinInfoBySymbol(symbol: string): RawCoinInfo[] {
    return this.symbolToCoinInfo[symbol] || [];
  }

  getCoinInfoByFullName(fullname: string): RawCoinInfo | undefined {
    return this.fullnameToCoinInfo[fullname];
  }

  getCoinInfoByIndex(index: number): RawCoinInfo | undefined {
    return this.indexToCoinInfo.get(index);
  }

  async update() {
    if (this.isUpdated) {
      return this.coinList;
    }
    return await this.updateDirect();
  }

  async updateDirect() {
    let response = await fetch(this.manifestUrl + '?t=' + Math.floor(Date.now() / 120 / 1000));
    this.coinList = await response.json()
    this.buildCache();
    this.isUpdated = true
    return this.coinList;
  }

  private clearCache() {
    if (this.indexToCoinInfo.size > 0) {
      this.indexToCoinInfo = new Map()
      this.fullnameToCoinInfo = {}
      this.symbolToCoinInfo = {}
    }
  }

  private buildCache() {
    this.clearCache()
    for (const coinInfo of this.coinList) {
      this.fullnameToCoinInfo[coinInfo.token_type.type] = coinInfo;
      const index = coinInfo.unique_index;
      if (index) {
        if (this.indexToCoinInfo.has(index)) {
          throw new Error(`${index} is used by multiple coins`);
        }
        this.indexToCoinInfo.set(index, coinInfo);
      }
      const symbol = coinInfo.symbol;
      if (!this.symbolToCoinInfo[symbol]) {
        this.symbolToCoinInfo[symbol] = [];
      }
      this.symbolToCoinInfo[coinInfo.symbol].push(coinInfo);
    }
  }
}