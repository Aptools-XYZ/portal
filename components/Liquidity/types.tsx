import { CoinInformation } from "../../models/CoinInformation";

export type Liquidity = {
  coin_x: CoinInformation;
  coin_y: CoinInformation;
  lpCoin?: CoinInformation;
};
