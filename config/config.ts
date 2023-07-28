import { FaucetClient, AptosClient } from 'aptos';

export const NODE_URLS = {
  testnet: 'https://fullnode.testnet.aptoslabs.com',
  mainnet: 'https://fullnode.mainnet.aptoslabs.com',
  devnet: 'https://fullnode.devnet.aptoslabs.com',
}

export const homeURL: string = "https://aptools.xyz";
export const githubURL: string = "https://github.com/aptools-xyz";
export const twitterURL: string = "https://twitter.com/aptools_";
export const telegramURL: string = "https://t.me/aptools_official";
export const discordURL: string = "https://discord.gg/Tjm3tCuX93";
export const mediumURL: string = "https://aptools.medium.com/";
export const chromeStoreExtURL: string = "https://fwch.io/chrome";
export const emailURL: string = "mailto:info@aptools.xyz";

export const firefoxStoreExtURL: string = "https://aptools.xyz";
export const docsURL: string = "https://docs.aptools.xyz";
export const dappUrl: string = "/create_coin/"

export const getNetwork = (network: string) => {
  if (/testnet/i.test(network)) return 'testnet'
  if (/devnet/i.test(network)) return 'devnet'
  if (/mainnet/i.test(network)) return 'mainnet'
  throw new Error(`Unsupported network: [${network || ""}]`)
}
export const getAptosClient = (network: string) => {
  if (!network) throw new Error(`Invalid Network.`)
  network = getNetwork(network.toLowerCase())
  if (process.env.NEXT_PUBLIC_CHAIN) {
    if (network !== process.env.NEXT_PUBLIC_CHAIN)
      throw new Error(`Only ${process.env.NEXT_PUBLIC_CHAIN} is supported.`)
  } else {
    const isProd = process.env.NODE_ENV === "production"
    if (isProd && network !== 'mainnet')
      throw new Error("Only mainnet is supported.")
  }

  return new AptosClient((NODE_URLS as any)[network])
};
