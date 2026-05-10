import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "a".repeat(64); // dummy for local
const RPC_URL = process.env.RPC_URL || "";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // ── Active: Linea Mainnet ─────────────────────────────────────────────────
    linea: {
      url: RPC_URL || "https://rpc.linea.build",
      accounts: [PRIVATE_KEY],
      chainId: 59144,
    },

    // ── Other options (uncomment to switch) ───────────────────────────────────
    // sepolia: {
    //   url: RPC_URL || "https://rpc.sepolia.org",
    //   accounts: [PRIVATE_KEY],
    //   chainId: 11155111,
    // },

    // polygon_amoy: {
    //   url: RPC_URL || "https://rpc-amoy.polygon.technology",
    //   accounts: [PRIVATE_KEY],
    //   chainId: 80002,
    // },

    // base_sepolia: {
    //   url: RPC_URL || "https://sepolia.base.org",
    //   accounts: [PRIVATE_KEY],
    //   chainId: 84532,
    // },

    // arbitrum_sepolia: {
    //   url: RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    //   accounts: [PRIVATE_KEY],
    //   chainId: 421614,
    // },
  },

  etherscan: {
    apiKey: process.env.LINEASCAN_API_KEY || "",
    customChains: [
      {
        network: "linea",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build",
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};
