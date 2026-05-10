# Foamy Falcon: A lab for problem solving... and making.

Money Access Crypto (MAC) — Learning Proof-of-Concept ERC-20 token deployed on Linea Mainnet (Ethereum Layer 2). Built with Solidity, Hardhat, and OpenZeppelin.

## Identity
- **ENS:** [moneyaccesscrypto.eth](https://app.ens.domains/name/moneyaccesscrypto.eth)
- **Contract:** [0x5291Ae7F79594214086Deaae0626dD6cbD5FB488](https://lineascan.build/address/0x5291Ae7F79594214086Deaae0626dD6cbD5FB488)
- **Chain:** Linea Mainnet (chainId: 59144)
- **Supply:** 1,000,000 MAC · Mintable + Burnable
- **Standard:** ERC-20 (OpenZeppelin)

---

## Run the Dashboard UI

### Option A — Open directly (read-only mode)
```bash
open ui/index.html
```

### Option B — Serve over HTTP (full mode, recommended)
```bash
npx serve ui
# then open http://localhost:3456
```

---

## Quick Start (fresh setup)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in: PRIVATE_KEY, RPC_URL

# 3. Run local node (separate terminal)
npm run node

# 4. Deploy locally
npm run deploy:local

# 5. Interact (mint/burn/transfer demo)
npm run interact
```

---

## Tech Stack
- **Solidity 0.8.20**
- **OpenZeppelin Contracts**
- **Hardhat 2**
- **ethers.js v6**
- **Linea (zkEVM)**

---

## Deploy to Linea Mainnet

```bash
# Make sure .env has PRIVATE_KEY and RPC_URL set
npm run deploy:linea

# Verify on Lineascan
npx hardhat verify --network linea <address> "Money Access Crypto" "MAC" 1000000 "<deployer>"
```

---

*Foamy Falcon Labs*