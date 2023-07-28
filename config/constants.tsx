import {
  discordURL,
  emailURL,
  mediumURL,
  telegramURL,
  twitterURL,
  chromeStoreExtURL,
  docsURL,
  dappUrl,
} from "config/config";

interface LinkItem {
  href?: string;
  name?: string;
  external?: string;
  label?: string;
  icon?: any;
  hot?: boolean;
  tips?: string;
}

export const MENUS: LinkItem[] = [
  // {
  //   href: "/app",
  //   name: "Home",
  // },
  {
    href: "/create_coin",
    name: "Coin Creator",
    tips: "Create a coin/token on Aptos without needing any development knowledge.",
    hot: true,
  },
  {
    href: "/coin_airdrop",
    name: "Airdropper",
    tips: "Aka: MultiSender, Send your coin to many receives so they can claim.",
  },
  {
    href: "/liquidity",
    name: "Liquidity",
    tips: "Manage your liquidity on different DEXes with ease.",
  },
  {
    href: "/lock_coin",
    name: "Locker",
    tips: "Lock any coin for a certain period of time, once it's locked, no one can take it out until the specific point of time.",
  },
  {
    href: "/coin_vesting",
    name: "Vesting",
    tips: "Deposit a number of coins and let users to claim time by time, cliff is supported.",
  },
  // {
  //   external: docsURL,
  //   name: 'Docs',
  //   icon: '/svgs/arrow-up-right-solid.svg',
  // },
  // {
  //   href: "/terms",
  //   name: "Terms",
  // },
  // {
  //   href: "/privacy",
  //   name: "Privacy",
  // },

  // {
  //   external: discordURL,
  //   name: "NFTs Playground",
  // },
];

export const FOOTER_MENU = [
  {
    label: "",
    href: "/",
  },
  {
    icon: "/svgs/twitter.svg",
    external: twitterURL,
    label: "Twitter",
  },
  {
    icon: "/svgs/telegram2.svg",
    external: telegramURL,
    label: "Telegram",
  },
  {
    icon: "/svgs/discord2.svg",
    external: discordURL,
    label: "Discord",
  },
  {
    external: mediumURL,
    icon: "/svgs/medium.svg",
    label: "Contact Us",
  },
  {
    external: emailURL,
    icon: "/svgs/email-mobile.svg",
    label: "Contact Us",
  },
];
export const MENU_MOBILE = {
  routerList: [
    {
      href: "/",
      name: "Home",
    },
    {
      href: "/create_coin",
      name: "Coin Creator",
    },
    {
      href: "/liquidity",
      name: "Liquidity",
    },
    {
      href: "/coin_airdrop",
      name: "Airdropper",
      tips: "aka: MultiSender",
    },
    {
      href: "/lock_coin",
      name: "Locker",
    },
    {
      href: "/coin_vesting",
      name: "Vesting",
    },
    {
      external: docsURL,
      name: "Docs",
      icon: "/svgs/arrow-up-right-solid.svg",
    },
    // {
    //   external: discordURL,
    //   name: 'Community',
    // },
    // {
    //   href: '/terms',
    //   name: 'Terms',
    // },
    // {
    //   href: '/privacy',
    //   name: 'Privacy',
    // },
    // {
    //   external: discordURL,
    //   name: "NFTs Playground",
    // },
  ],
  links: [
    {
      label: "email",
      link: emailURL,
      srcImg: "/svgs/email-mobile.svg",
    },
    // {
    //   label: 'discord',
    //   link: discordURL,
    //   srcImg: '/svgs/discord-mobile.svg',
    // },
    {
      label: "tweeter",
      link: twitterURL,
      srcImg: "/svgs/twitter-mobile.svg",
    },
    // {
    //   label: 'telegram',
    //   link: telegramURL,
    //   srcImg: '/svgs/telegram-mobile.svg',
    // },
  ],
};

export const HOME_SECTION = {
  description: "Simple, Elegant and Easy to use like a Swiss-army knife.",
  features: [
    "Coin tool that enables you to create a coin without any developer needed.",
    "Airdrop tool lets you to spread your coins to a wide range of users.",
    "Locker enables you the ability to lock your any coin to show your faith of your project.",
    "Three tools are all available on Aptos mainnet!",
  ],
  getExt: "Get Started!",
  imgExt: "/svgs/aptos-o.svg",
  imgBgMobile: "/images/swiss-army-knife.jpeg",
  linkExt: dappUrl,
};

export const COIN_SECTION = {
  title: "Create your own coin without any knowledge of MOVE on Aptos.",
  des: "We do it all for you with very minor service fee.",
  steps: [
    "Pay fee of 5 $APT first into smart contracts.",
    "Submit your information about the coin to our server.",
    "Wait for the process to finish.",
    "Withdraw all the coins minted to your own wallet",
  ],
};

export const AIRDROP_SECTION = {
  title: "Send coins to multiple receiver(s) all at once.",
  des: "Everything can be directly done on one page, Secure, Easy and Fast",
  steps: [
    "Prepare: Enter/upload receiver(s) (address and amount)",
    "Proceed your request with 0.1% of your coins sent as fee.",
    "Click `Send` and just wait for it to be all done!",
  ],
};

export const VESTING_SECTION = {
  title:
    "Allowing automated coin distribution for investors/employees and advisors.",
  des: "Stop making mistakes by manually distribute coins periodically",
  steps: [
    "Time saving: No more spreadsheet every month.",
    "Reduce errors: Manual work can easily make mistakes.",
    "Reduce selling pressures: cliff is supported.",
  ],
};

export const LIQUIDITY_SECTION = {
  title: "Manage Liquidity on primary DEXes easily",
  des: "Without having to go to DEXes directly, you can manage your liquidity here. ",
  steps: [
    "Liquidswap [Implemented]",
    "Pancake [Implemented]",
    "ThalaSwap [Coming soon]",
    "Yet more to come...",
  ],
};

export const CLAIM_SECTION = {
  title: "Claim your airdrop here if you are qualified.",
  des: "Simply click `Claim` button to receive your rewards.",
  steps: [
    "Enter the link you received to browser address bar.",
    "You claimable amount of the coin appears.",
    "Verify everything is correct and then click `Claim` button.",
  ],
};

export const VESTING_CLAIM_SECTION = {
  title: "Claim your coins here if you are qualified.",
  des: "Simply click `Claim` button to receive your rewards.",
  steps: [
    "Enter the link you received to browser address bar.",
    "You claimable amount of the coin appears.",
    "Verify everything is correct and then click `Claim` button.",
  ],
};

export const LOCK_SECTION = {
  title: "Lock any coin/liquidity instantly.",
  des: "Show team's determination to the community.",
  steps: [
    "All coins are locked up in smart contracts on Aptos blockchain.",
    "No one can withdraw it before the unlock time.",
    "Ownership is transferrable between the initial owner to another address.",
    "Service Fee is 10 $APT.",
  ],
  link: {
    text: "View Example Certificate",
    href: "/images/example-certificate.png",
    icon: "/svgs/aptos-o.svg",
  },
};

export const UNLOCK_SECTION = {
  title: "The key to Aptos",
  description: "Unlock it's full potential with Aptools.",
  content: [
    {
      id: 1,
      label: "Fully Secured",
      des: "You can make, lock and vest Tokens with Aptools",
      imgPhone: "images/Iphone12Pro-1.png",
      shape: "/svgs/shape1.svg",
    },
    {
      id: 2,
      label: "Independent Audit",
      des: "Aptools' safety and security will be thoroughly audited fully.",
      imgPhone: "images/Iphone12Pro-2.png",
      shape: "/svgs/shape2.svg",
    },
    {
      id: 3,
      label: "Provide Web3",
      des: "Aptools provides web3 connection for your projects with Aptos ecosystem in a handy way.",
      imgPhone: "images/Iphone12Pro-3.png",
      shape: "/svgs/shape3.svg",
    },
    {
      id: 4,
      label: "Privacy matters",
      des: "We know privacy is a fundamental human right. So only you can access your wallet. You are in control of your funds at all times",
      imgPhone: "images/Iphone12Pro-4.png",
      shape: "/svgs/shape4.svg",
    },
  ],
};

export const INSTALL_SECTION = {
  title: "Have some fantastic ideas?",
  des: "Let us know and we will implement for you.",
  more: "Contact us",
  linkExt: discordURL,
};

export const JOIN_SECTION = {
  title: "Join us",
  des: "Aptools is currently under development, we value your support, please joining our community.",
  links: [
    {
      label: "Twitter",
      src: "/svgs/twitter.svg",
      href: twitterURL,
    },
  ],
};
