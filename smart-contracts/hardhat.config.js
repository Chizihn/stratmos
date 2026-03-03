require("dotenv/config");
require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 10143,
    },
    monadMainnet: {
      url: "https://rpc.monad.xyz",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 143,
    },
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify-api-monad.blockvision.org",
    browserUrl: "https://monadvision.com",
  },
  etherscan: {
    enabled: true,
    apiKey: {
      monadMainnet: ETHERSCAN_API_KEY,
      monadTestnet: ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "monadMainnet",
        chainId: 143,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=143",
          browserURL: "https://monadscan.com",
        },
      },
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=10143",
          browserURL: "https://testnet.monadscan.com",
        },
      },
    ],
  },
};
