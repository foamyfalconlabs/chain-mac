/**
 * Quick interaction script — mint, burn, transfer, check balances.
 * Usage:
 *   npm run interact   → runs against local Hardhat node
 */

import pkg from "hardhat";
const { ethers } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deployed = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/deployed.json"), "utf8"));

async function main() {
  const [owner, wallet1, wallet2] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const isLocal = network.chainId === 31337n;

  const entry = isLocal ? deployed.local : deployed.testnet;
  if (!entry?.address) {
    console.error("❌  No deployed address found. Run deploy first.");
    process.exit(1);
  }

  const Token = await ethers.getContractAt("Token", entry.address);
  const name = await Token.name();
  const symbol = await Token.symbol();

  console.log(`\n🪙  Interacting with ${name} (${symbol})`);
  console.log(`    Contract: ${entry.address}`);
  console.log(`    Owner:    ${owner.address}\n`);

  const totalSupply = await Token.totalSupply();
  const ownerBalance = await Token.balanceOf(owner.address);

  console.log(`Total supply:    ${ethers.formatEther(totalSupply)} ${symbol}`);
  console.log(`Owner balance:   ${ethers.formatEther(ownerBalance)} ${symbol}`);

  if (isLocal && wallet1) {
    const mintAmount = ethers.parseEther("1000");
    console.log(`\nMinting 1,000 ${symbol} to wallet1...`);
    const mintTx = await Token.connect(owner).mint(wallet1.address, mintAmount);
    await mintTx.wait();
    const w1Balance = await Token.balanceOf(wallet1.address);
    console.log(`wallet1 balance: ${ethers.formatEther(w1Balance)} ${symbol}`);

    if (wallet2) {
      const transferAmount = ethers.parseEther("100");
      console.log(`\nTransferring 100 ${symbol} wallet1 → wallet2...`);
      const txTransfer = await Token.connect(wallet1).transfer(wallet2.address, transferAmount);
      await txTransfer.wait();
      const w2Balance = await Token.balanceOf(wallet2.address);
      console.log(`wallet2 balance: ${ethers.formatEther(w2Balance)} ${symbol}`);
    }

    const burnAmount = ethers.parseEther("50");
    console.log(`\nBurning 50 ${symbol} from owner...`);
    const burnTx = await Token.connect(owner).burn(burnAmount);
    await burnTx.wait();
    const newSupply = await Token.totalSupply();
    console.log(`New total supply: ${ethers.formatEther(newSupply)} ${symbol}`);
  }

  console.log("\n✅  Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
