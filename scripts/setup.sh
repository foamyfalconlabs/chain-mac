#!/usr/bin/env bash
# Run this once to bootstrap the Hardhat project.
# Usage: bash scripts/setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "🔧  Setting up coin-poc Hardhat project..."
cd "$ROOT"

# Init package.json if missing
if [ ! -f package.json ]; then
  npm init -y
fi

# Install Hardhat + toolchain
npm install --save-dev \
  hardhat \
  @nomicfoundation/hardhat-toolbox \
  @nomicfoundation/hardhat-ethers \
  ethers \
  dotenv

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts

# Copy .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝  Created .env from .env.example — fill in your keys"
fi

echo ""
echo "✅  Setup complete. Next steps:"
echo "   1. Fill in .env (PRIVATE_KEY, RPC_URL, TOKEN_NAME, TOKEN_SYMBOL)"
echo "   2. Update config/token-config.json with your tokenomics"
echo "   3. npm run node              → start local Hardhat node"
echo "   4. npm run deploy:local      → deploy to local node"
echo "   5. npm run interact          → mint/burn/transfer demo"
echo "   6. open ui/index.html        → view dashboard"
