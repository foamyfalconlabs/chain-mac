/**
 * Hardhat deploy script — works for local node and any EVM network.
 * Run:
 *   npm run deploy:local    → deploys to Hardhat node (localhost:8545)
 *   npm run deploy:linea    → deploys to Linea Mainnet
 */

import pkg from "hardhat";
const { ethers } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tokenConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/token-config.json"), "utf8"));
const deployedConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/deployed.json"), "utf8"));

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const isLocal = network.chainId === 31337n;

  console.log("\n🪙  Token Deploy Script");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Network:   ${isLocal ? "local (Hardhat)" : network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer:  ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:   ${ethers.formatEther(balance)} ETH`);

  // ── Read config (override with .env vars if set) ─────────────────────────────
  const name = process.env.TOKEN_NAME || tokenConfig.identity.name;
  const symbol = process.env.TOKEN_SYMBOL || tokenConfig.identity.symbol;
  const initialSupply = Number(process.env.TOKEN_INITIAL_SUPPLY) || tokenConfig.supply.initialSupply;

  if (name === "TBD" || symbol === "TBD") {
    console.error("\n❌  TOKEN_NAME or TOKEN_SYMBOL is not set. Update config/token-config.json or .env first.");
    process.exit(1);
  }

  console.log(`\nToken:     ${name} (${symbol})`);
  console.log(`Supply:    ${initialSupply.toLocaleString()} tokens`);
  console.log("");

  // ── Deploy ────────────────────────────────────────────────────────────────────
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(name, symbol, initialSupply, deployer.address);
  await token.waitForDeployment();

  const address = await token.getAddress();
  const txHash = token.deploymentTransaction()?.hash;

  console.log(`✅  Deployed: ${address}`);
  console.log(`    TX:      ${txHash}`);

  // ── Save to config/deployed.json ─────────────────────────────────────────────
  const key = isLocal ? "local" : "testnet";
  deployedConfig[key] = {
    chain: isLocal ? "local" : network.name,
    address,
    deployedAt: new Date().toISOString(),
    txHash,
    deployer: deployer.address,
    explorerUrl: isLocal ? null : `${getExplorerBase(network.chainId)}/address/${address}`,
  };

  fs.writeFileSync(
    path.join(__dirname, "../config/deployed.json"),
    JSON.stringify(deployedConfig, null, 2)
  );
  console.log(`\n💾  Saved to config/deployed.json`);

  // ── Verification hint ─────────────────────────────────────────────────────────
  if (!isLocal) {
    console.log(`\n🔍  Verify on Lineascan:`);
    console.log(`    npx hardhat verify --network linea ${address} "${name}" "${symbol}" ${initialSupply} "${deployer.address}"`);
  }

  return { address, txHash };
}

function getExplorerBase(chainId) {
  const map = {
    59144n: "https://lineascan.build",
    11155111n: "https://sepolia.etherscan.io",
    80002n: "https://amoy.polygonscan.com",
    84532n: "https://sepolia.basescan.org",
    421614n: "https://sepolia.arbiscan.io",
  };
  return map[chainId] || "https://lineascan.build";
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
