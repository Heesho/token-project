const { config } = require("dotenv");

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");

config();
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CANTOSCAN_API_KEY = process.env.FTMSCAN_API_KEY || "";
const FTMSCAN_API_KEY = process.env.FTMSCAN_API_KEY || "";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const MATICSCAN_API_KEY = process.env.MATICSCAN_API_KEY || "";
const OPTIMISM_API_KEY = process.env.OPTIMISM_API_KEY || "";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true
        }
      },
    },
  },
  networks: {
    hardhat: {
      // Fantom
      // chainId: 250,
      // forking: {
      //   url: "https://rpc.ftm.tools",
      // },
      // Canto
      // chainId: 7700,
      // forking: {
      //   url: "https://mainnode.plexnode.org:8545",
      //   blockNumber: 4266801,
      // },
      // resetBlockNumber: 4266801,
    },
    // mainnet: {
    //   url:
    //   "https://rpc.ftm.tools/",
    //   chainId: 250,
    //   accounts: [PRIVATE_KEY],
    // },
    // mainnet: {
    //   url:'https://arb1.arbitrum.io/rpc',
    //   browserURL: "https://arbiscan.io/",
    //   chainId: 42161,
    //   accounts: [PRIVATE_KEY],
    // },
    // mainnet: {
    //   url:'https://mainnet.optimism.io',
    //   browserURL: "https://optimistic.etherscan.io",
    //   chainId: 10,
    //   accounts: [PRIVATE_KEY],
    // },
    // mainnet: {
    //   url:'https://bsc-dataseed.binance.org/',
    //   chainId: 56,
    //   accounts: [PRIVATE_KEY],
    // },
    // mainnet: {
    //   url:'https://1rpc.io/matic',
    //   chainId: 137,
    //   accounts: [PRIVATE_KEY],
    // },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: ARBISCAN_API_KEY,
      opera: FTMSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY,
      polygon: MATICSCAN_API_KEY,
      optimisticEthereum: OPTIMISM_API_KEY
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./tests/local",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 300000,
  },
};
