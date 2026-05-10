/**
 * Token POC Dashboard — app.js
 *
 * Works in two modes:
 *   1. READ-ONLY  — loads config JSON, shows design decisions, no wallet needed
 *   2. LIVE       — connects MetaMask, reads on-chain state, enables actions
 *
 * To switch to LIVE mode: click "Connect Wallet" after deploying the contract.
 */

// ── Inlined configs (mirrors config/*.json — update both if you change values) ─
// Fetch is blocked on file:// URLs, so configs are embedded here for local use.
const INLINE_TOKEN_CONFIG = {
  identity: { name: "Money Access Crypto", symbol: "MAC", decimals: 18, version: "1.0.0", logoUrl: "" },
  supply: { model: "mintable+burnable", initialSupply: 1000000, initialSupplyUnit: "tokens", maxSupply: null },
  distribution: { deployer: 80, reserve: 15, testWallets: 5 },
  roles: { model: "owner" },
  stablecoinLite: { enabled: false, pegTarget: "$1 USD", pegMechanism: "manual" },
  features: { pausable: true, transferFee: false, transferFeePercent: 0, feeRecipient: "", snapshot: false },
};

const INLINE_NETWORKS_CONFIG = {
  active: "linea",
  chains: {
    linea:            { name: "Linea Mainnet",     chainId: 59144,    standard: "ERC-20 (zkEVM)", explorer: "https://lineascan.build", bridge: "https://bridge.linea.build" },
    ethereum_sepolia: { name: "Ethereum Sepolia",  chainId: 11155111, standard: "ERC-20", faucet: "https://faucets.chain.link/sepolia" },
    polygon_amoy:     { name: "Polygon Amoy",      chainId: 80002,    standard: "ERC-20", faucet: "https://faucet.polygon.technology" },
    base_sepolia:     { name: "Base Sepolia",       chainId: 84532,    standard: "ERC-20", faucet: "https://faucet.quicknode.com/base/sepolia" },
    arbitrum_sepolia: { name: "Arbitrum Sepolia",   chainId: 421614,   standard: "ERC-20", faucet: "https://faucets.chain.link/arbitrum-sepolia" },
  },
  local: { name: "Hardhat Local", chainId: 31337, rpc: "http://127.0.0.1:8545" },
};

const INLINE_DEPLOYED_CONFIG = {
  local: { address: null, deployedAt: null, txHash: null, deployer: null },
  testnet: {
    chain: "linea",
    address: "0x5291Ae7F79594214086Deaae0626dD6cbD5FB488",
    deployedAt: "2026-04-23T15:31:02.690Z",
    txHash: "0x69c2801da046fcc74b755e50edac8d045279ba9743bf972e0a78b32ca6d0a664",
    deployer: "0xC4E206B6ddc8A91780091594ac3e999B3Da6e707",
    explorerUrl: "https://lineascan.build/token/0x5291Ae7F79594214086Deaae0626dD6cbD5FB488",
  },
};

// ── Minimal ERC-20 ABI (only what we need for the dashboard) ────────────────
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function paused() view returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function pause()",
  "function unpause()",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ── Checklist items (mirrors CHECKLIST.md phases) ───────────────────────────
const CHECKLIST = [
  { phase: "0 · Identity",    label: "Pick a token name & ticker",               key: "name" },
  { phase: "0 · Identity",    label: "Verify ticker is clear (CoinGecko)",        key: "ticker_check" },
  { phase: "1 · Foundation",  label: "Choose blockchain",                         key: "chain" },
  { phase: "1 · Foundation",  label: "Bridge ETH to Linea (bridge.linea.build)",  key: "faucet" },
  { phase: "2 · Tokenomics",  label: "Define supply model",                       key: "supply_model" },
  { phase: "2 · Tokenomics",  label: "Define token distribution",                 key: "distribution" },
  { phase: "3 · Contract",    label: "Compile smart contract",                    key: "compile" },
  { phase: "3 · Contract",    label: "Write & pass unit tests",                   key: "tests" },
  { phase: "3 · Contract",    label: "Install dependencies",                      key: "setup" },
  { phase: "4 · Deploy",      label: "Deploy to local Hardhat node",              key: "deploy_local" },
  { phase: "4 · Deploy",      label: "Deploy to Linea Mainnet",                   key: "deploy_linea" },
  { phase: "4 · Deploy",      label: "Verify contract on Lineascan",              key: "verify" },
  { phase: "5 · Dashboard",   label: "Dashboard UI live",                         key: "ui" },
  { phase: "5 · Dashboard",   label: "Connect wallet — live on-chain data",       key: "wallet_connect" },
  { phase: "5 · Dashboard",   label: "Mint MAC to DAX & other wallets",           key: "mint_dax" },
  { phase: "6 · Oracle",      label: "Stablecoin-lite oracle hook (optional)",    key: "oracle" },
  { phase: "7 · Brand",       label: "Design MAC token logo (PNG, 200×200+)",     key: "logo_design" },
  { phase: "7 · Brand",       label: "Submit logo + info to Lineascan",           key: "lineascan_info" },
  { phase: "7 · Brand",       label: "Submit to Linea official token list (GitHub PR)", key: "linea_tokenlist" },
  { phase: "7 · Brand",       label: "Register ENS domain (moneyaccesscrypto.eth)", key: "ens" },
  { phase: "7 · Brand",       label: "Set up Dune Analytics public dashboard",    key: "dune" },
  { phase: "7 · Brand",       label: "Embed Dune in dashboard (More tab)",        key: "dune_embed" },
  { phase: "7 · Brand",       label: "Publish project landing page",              key: "landing" },
  { phase: "8 · Currency",    label: "Define MAC utility / use case",             key: "utility" },
  { phase: "8 · Currency",    label: "Create Uniswap v3 liquidity pool (DEX)",    key: "dex" },
  { phase: "8 · Currency",    label: "List on CoinGecko / CoinMarketCap",         key: "listing" },
];

// ── State ────────────────────────────────────────────────────────────────────
let state = {
  provider: null,
  signer: null,
  contract: null,
  tokenConfig: null,
  networksConfig: null,
  deployedConfig: null,
  walletAddress: null,
  checklistDone: JSON.parse(localStorage.getItem("cl_done") || "[]"),
};

// ── Boot ─────────────────────────────────────────────────────────────────────
async function init() {
  initTabs();
  await loadConfigs();
  renderTokenHeader();
  renderHomeDetails();
  renderChecklist();
  renderConfigTable();
  renderNetworkTable();
  await tryAutoConnect();
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
    });
  });
}

// ── Home detail fields ────────────────────────────────────────────────────────
function renderHomeDetails() {
  const cfg  = state.tokenConfig  || {};
  const nets = state.networksConfig || {};
  const dep  = state.deployedConfig || {};

  const id   = cfg.identity  || {};
  const sup  = cfg.supply    || {};
  const dist = cfg.distribution || {};
  const sl   = cfg.stablecoinLite || {};

  const activeChain = nets.active !== "UNSET" ? (nets.chains?.[nets.active]?.name || nets.active) : null;
  const addr = dep.testnet?.address || dep.local?.address;

  setDetail("d-name",         id.name !== "TBD" ? id.name : null,         "Not set yet");
  setDetail("d-symbol",       id.symbol !== "TBD" ? id.symbol : null,     "Not set yet");
  setDetail("d-chain",        activeChain,                                 "Not chosen yet");
  setDetail("d-supply-model", sup.model,                                   "Not set yet");
  setDetail("d-initial-supply", sup.initialSupply ? `${sup.initialSupply.toLocaleString()} tokens` : null, "Not set yet");
  setDetail("d-stable",       sl.enabled ? `Yes — ${sl.pegMechanism}` : "Disabled",  null);
  setDetail("d-address",      addr ? shortAddr(addr) : null,               "Not deployed");
  setDetail("d-status",       addr ? "✅ Live on Linea" : "Pending deploy", null);

  // Update the prominent Lineascan button href from config (in case config changes)
  const explorerUrl = dep.testnet?.explorerUrl;
  const lsLink = document.getElementById("lineascan-link");
  if (lsLink && explorerUrl) lsLink.href = explorerUrl;

  // TX hash + deploy date
  setDetail("d-tx",     dep.testnet?.txHash   ? shortAddr(dep.testnet.txHash)                          : null, "—");
  setDetail("d-deploy-date", dep.testnet?.deployedAt ? new Date(dep.testnet.deployedAt).toLocaleDateString() : null, "—");

  // Distribution stat cards
  setText("stat-deployer-pct", dist.deployer != null ? `${dist.deployer}%` : "—");
  setText("stat-reserve-pct",  dist.reserve  != null ? `${dist.reserve}%`  : "—");
}

function setDetail(id, value, placeholder) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value) {
    el.textContent = value;
    el.classList.remove("placeholder");
  } else {
    el.textContent = placeholder || "—";
    el.classList.add("placeholder");
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Load JSON configs ────────────────────────────────────────────────────────
// Uses inlined defaults always; tries to fetch live files when served over http.
async function loadConfigs() {
  state.tokenConfig    = INLINE_TOKEN_CONFIG;
  state.networksConfig = INLINE_NETWORKS_CONFIG;
  state.deployedConfig = INLINE_DEPLOYED_CONFIG;

  if (location.protocol.startsWith("http")) {
    try {
      const [token, networks, deployed] = await Promise.all([
        fetchJson("../config/token-config.json"),
        fetchJson("../config/networks.json"),
        fetchJson("../config/deployed.json"),
      ]);
      state.tokenConfig    = token;
      state.networksConfig = networks;
      state.deployedConfig = deployed;
    } catch (e) {
      console.warn("Could not fetch config files, using inlined defaults:", e.message);
    }
  }
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} not found (${res.status})`);
  return res.json();
}

// ── Token header ─────────────────────────────────────────────────────────────
function renderTokenHeader() {
  const cfg = state.tokenConfig?.identity || {};
  const name = cfg.name !== "TBD" ? cfg.name : "Token POC";
  const symbol = cfg.symbol !== "TBD" ? cfg.symbol : "TKN";
  document.getElementById("token-name").textContent = name;
  document.getElementById("token-symbol").textContent = symbol;
  document.title = `${name} Dashboard`;
}

// ── Checklist ─────────────────────────────────────────────────────────────────
function renderChecklist() {
  const container = document.getElementById("checklist-items");
  container.innerHTML = "";

  // Auto-detect done states from config
  const cfg = state.tokenConfig || {};
  const dep = state.deployedConfig || {};
  const auto = new Set();
  if (cfg.identity?.name !== "TBD")       { auto.add("name"); auto.add("ticker_check"); }
  if (state.networksConfig?.active !== "UNSET") { auto.add("chain"); }
  if (cfg.supply?.model)                  { auto.add("supply_model"); }
  if (cfg.distribution?.deployer != null) { auto.add("distribution"); }
  if (dep.local?.address)  { auto.add("deploy_local"); auto.add("setup"); auto.add("compile"); auto.add("tests"); }
  if (dep.testnet?.address || dep.linea?.address) { auto.add("deploy_linea"); }
  auto.add("ui");

  // Group items by phase
  const phases = {};
  CHECKLIST.forEach(item => {
    if (!phases[item.phase]) phases[item.phase] = [];
    phases[item.phase].push(item);
  });

  // Build two-column grid
  const grid = document.createElement("div");
  grid.className = "cl-grid";

  Object.entries(phases).forEach(([phase, items]) => {
    const group = document.createElement("div");
    group.className = "cl-group";

    const allDone = items.every(i => state.checklistDone.includes(i.key) || auto.has(i.key));
    const [phaseNum, phaseName] = phase.split(" · ");
    group.innerHTML = `<div class="cl-group-header ${allDone ? "done" : ""}">
      <span class="cl-group-check">${allDone ? "✓" : ""}</span>
      <span class="cl-group-num">${phaseNum}</span>
      <span class="cl-group-name">${phaseName}</span>
    </div>`;

    items.forEach(item => {
      const done = state.checklistDone.includes(item.key) || auto.has(item.key);
      const el = document.createElement("div");
      el.className = `checklist-item ${done ? "done" : ""}`;
      el.dataset.key = item.key;
      el.innerHTML = `
        <div class="cl-check">${done ? "✓" : ""}</div>
        <span class="cl-text">${item.label}</span>
      `;
      el.addEventListener("click", () => toggleCheck(item.key, auto.has(item.key)));
      group.appendChild(el);
    });

    grid.appendChild(group);
  });

  container.appendChild(grid);
  updateChecklistProgress();
}

function toggleCheck(key, isAuto) {
  if (isAuto) return;
  const idx = state.checklistDone.indexOf(key);
  if (idx === -1) state.checklistDone.push(key);
  else state.checklistDone.splice(idx, 1);
  localStorage.setItem("cl_done", JSON.stringify(state.checklistDone));
  renderChecklist();
}

function updateChecklistProgress() {
  const total = CHECKLIST.length;
  const done = document.querySelectorAll(".checklist-item.done").length;
  const pct = Math.round((done / total) * 100);
  document.getElementById("checklist-bar").style.width = `${pct}%`;
  document.getElementById("checklist-pct").textContent = `${pct}%`;
}

// ── Config table ──────────────────────────────────────────────────────────────
function renderConfigTable() {
  const cfg = state.tokenConfig || {};
  const id = cfg.identity || {};
  const sup = cfg.supply || {};
  const dist = cfg.distribution || {};

  const rows = [
    ["Name",          id.name || "TBD"],
    ["Symbol",        id.symbol || "TBD"],
    ["Decimals",      id.decimals ?? 18],
    ["Supply model",  sup.model || "—"],
    ["Initial supply",sup.initialSupply ? `${sup.initialSupply.toLocaleString()} tokens` : "—"],
    ["Deployer %",    dist.deployer != null ? `${dist.deployer}%` : "—"],
    ["Reserve %",     dist.reserve != null ? `${dist.reserve}%` : "—"],
    ["Pausable",      cfg.features?.pausable ? "Yes" : "No"],
    ["Transfer fee",  cfg.features?.transferFee ? `${cfg.features.transferFeePercent}%` : "No"],
    ["Stablecoin-lite", cfg.stablecoinLite?.enabled ? `Yes — ${cfg.stablecoinLite.pegMechanism}` : "Disabled"],
  ];

  renderTable("config-table", rows);
}

function renderNetworkTable() {
  const nets = state.networksConfig || {};
  const active = nets.active || "UNSET";
  const dep = state.deployedConfig || {};

  const chain = active !== "UNSET" ? (nets.chains?.[active] || {}) : {};
  const rows = [
    ["Selected chain",  active === "UNSET" ? "Not set — see config/networks.json" : active],
    ["Name",            chain.name || "—"],
    ["Chain ID",        chain.chainId || "—"],
    ["Standard",        chain.standard || "—"],
    ["Local deployed",  dep.local?.address  ? shortAddr(dep.local.address)  : "No"],
    ["Linea deployed",  dep.testnet?.address ? shortAddr(dep.testnet.address) : "No"],
  ];

  renderTable("network-table", rows);
}

function renderTable(id, rows) {
  const tbody = document.querySelector(`#${id} tbody`);
  tbody.innerHTML = rows.map(([k, v]) =>
    `<tr><td>${k}</td><td>${v}</td></tr>`
  ).join("");
}

// ── Wallet / MetaMask ─────────────────────────────────────────────────────────
async function tryAutoConnect() {
  if (typeof window.ethereum === "undefined") return;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (accounts.length > 0) await connectWallet();
}

document.getElementById("btn-connect").addEventListener("click", connectWallet);

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    showBanner("MetaMask not found. Install it to enable live on-chain features.", "warn");
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    state.walletAddress = accounts[0];
    state.provider = new ethers.BrowserProvider(window.ethereum);
    state.signer = await state.provider.getSigner();

    document.getElementById("wallet-address").textContent = shortAddr(state.walletAddress);
    document.getElementById("wallet-address").classList.remove("hidden");
    document.getElementById("btn-connect").classList.add("hidden");

    const network = await state.provider.getNetwork();
    document.getElementById("network-badge").textContent = `🟢 ${network.name} (${network.chainId})`;
    document.getElementById("network-badge").classList.add("connected");
    document.getElementById("footer-chain").textContent = `chain: ${network.chainId}`;

    await loadContractData();
    enableActions();
    await loadTransactions();
  } catch (e) {
    showBanner(`Wallet connection failed: ${e.message}`, "error");
  }
}

// ── On-chain data ─────────────────────────────────────────────────────────────
async function loadContractData() {
  const dep = state.deployedConfig;
  const network = await state.provider.getNetwork();
  const isLocal = network.chainId === 31337n;
  const addr = isLocal ? dep?.local?.address : dep?.testnet?.address;

  if (!addr) {
    showBanner("Contract not deployed yet. Run `npm run deploy:local` first.", "warn");
    return;
  }

  state.contract = new ethers.Contract(addr, ERC20_ABI, state.signer);

  const [name, symbol, totalSupply, balance, paused] = await Promise.all([
    state.contract.name(),
    state.contract.symbol(),
    state.contract.totalSupply(),
    state.contract.balanceOf(state.walletAddress),
    state.contract.paused().catch(() => false),
  ]);

  document.getElementById("token-name").textContent = name;
  document.getElementById("token-symbol").textContent = symbol;
  setText("stat-supply",  `${fmt(totalSupply)} ${symbol}`);
  setText("stat-balance", `${fmt(balance)} ${symbol}`);

  // Update home detail fields with live on-chain data
  setDetail("d-name",    name,   null);
  setDetail("d-symbol",  symbol, null);
  setDetail("d-address", shortAddr(addr), null);
  setDetail("d-status",  paused ? "⏸ Paused" : "✅ Active", null);

  showBanner(`Connected to ${name} (${symbol}) on-chain.`, "ok");
  document.getElementById("btn-pause").textContent = paused ? "Unpause Contract" : "Pause Contract";
}

async function loadTransactions() {
  if (!state.contract) return;
  try {
    const filter = state.contract.filters.Transfer();
    const logs = await state.contract.queryFilter(filter, -500);
    renderTransactions(logs);
  } catch (e) {
    console.warn("Could not load transfer events:", e.message);
  }
}

function renderTransactions(logs) {
  if (!logs.length) return;
  const tbody = document.getElementById("tx-body");
  document.getElementById("tx-empty").classList.add("hidden");
  document.getElementById("tx-table").classList.remove("hidden");

  tbody.innerHTML = logs.slice(-20).reverse().map(log => {
    const from = log.args[0];
    const to = log.args[1];
    const amount = log.args[2];
    const isMint = from === ethers.ZeroAddress;
    const isBurn = to === ethers.ZeroAddress;
    const type = isMint ? "mint" : isBurn ? "burn" : "transfer";
    return `<tr>
      <td><span class="tx-type ${type}">${type}</span></td>
      <td title="${from}">${shortAddr(from)}</td>
      <td title="${to}">${shortAddr(to)}</td>
      <td>${fmt(amount)}</td>
      <td title="${log.transactionHash}">${shortAddr(log.transactionHash)}</td>
      <td>block ${log.blockNumber}</td>
    </tr>`;
  }).join("");
}

document.getElementById("btn-refresh-tx").addEventListener("click", loadTransactions);

// ── Actions ───────────────────────────────────────────────────────────────────
function enableActions() {
  ["btn-mint", "btn-burn", "btn-transfer", "btn-pause"].forEach(id => {
    document.getElementById(id).disabled = false;
  });
}

document.getElementById("btn-mint").addEventListener("click", async () => {
  const to = document.getElementById("mint-to").value.trim();
  const amount = document.getElementById("mint-amount").value;
  if (!to || !amount) return;
  await callContract(() => state.contract.mint(to, ethers.parseEther(amount)), "Mint");
});

document.getElementById("btn-burn").addEventListener("click", async () => {
  const amount = document.getElementById("burn-amount").value;
  if (!amount) return;
  await callContract(() => state.contract.burn(ethers.parseEther(amount)), "Burn");
});

document.getElementById("btn-transfer").addEventListener("click", async () => {
  const to = document.getElementById("transfer-to").value.trim();
  const amount = document.getElementById("transfer-amount").value;
  if (!to || !amount) return;
  await callContract(() => state.contract.transfer(to, ethers.parseEther(amount)), "Transfer");
});

document.getElementById("btn-pause").addEventListener("click", async () => {
  const paused = (document.getElementById("d-status")?.textContent || "").includes("Paused");
  await callContract(() => paused ? state.contract.unpause() : state.contract.pause(), "Pause toggle");
});

async function callContract(fn, label) {
  try {
    showBanner(`${label} — waiting for wallet confirmation...`, "info");
    const tx = await fn();
    showBanner(`${label} — tx submitted: ${shortAddr(tx.hash)}. Waiting...`, "info");
    await tx.wait();
    showBanner(`${label} — confirmed!`, "ok");
    await loadContractData();
    await loadTransactions();
  } catch (e) {
    showBanner(`${label} failed: ${e.message}`, "error");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showBanner(msg, type = "info") {
  const el = document.getElementById("status-banner");
  el.className = `banner banner-${type}`;
  el.textContent = msg;
}

function shortAddr(addr) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmt(bn) {
  try { return Number(ethers.formatEther(bn)).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
  catch { return String(bn); }
}

// ════════════════════════════════════════════════════════════════════════════
// NAME RESEARCH
// ════════════════════════════════════════════════════════════════════════════

document.getElementById("btn-name-search").addEventListener("click", runNameSearch);
document.getElementById("nr-ticker").addEventListener("input", e => {
  e.target.value = e.target.value.toUpperCase();
});

async function runNameSearch() {
  const name   = document.getElementById("nr-name").value.trim();
  const ticker = document.getElementById("nr-ticker").value.trim().toUpperCase();
  if (!name && !ticker) return;

  const query = ticker || name;

  document.getElementById("nr-results").classList.add("hidden");
  document.getElementById("nr-error").classList.add("hidden");
  document.getElementById("nr-loading").classList.remove("hidden");

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
    const data = await res.json();
    renderNameResults(data.coins || [], name, ticker);
  } catch (e) {
    document.getElementById("nr-loading").classList.add("hidden");
    const errEl = document.getElementById("nr-error");
    errEl.textContent = `Search failed: ${e.message}. CoinGecko may be rate-limiting — try again in a moment.`;
    errEl.classList.remove("hidden");
  }
}

function renderNameResults(coins, name, ticker) {
  document.getElementById("nr-loading").classList.add("hidden");
  document.getElementById("nr-results").classList.remove("hidden");

  const cgEl = document.getElementById("nr-cg-results");
  const top = coins.slice(0, 6);

  if (!top.length) {
    cgEl.innerHTML = `<div class="nr-coin" style="color:var(--accent2)">✓ No matches found on CoinGecko — looks clear!</div>`;
  } else {
    const rows = top.map(c => {
      const symMatch  = ticker && c.symbol.toUpperCase() === ticker;
      const nameMatch = name   && c.name.toLowerCase()   === name.toLowerCase();
      const exact = symMatch || nameMatch;
      const close = !exact && (
        (ticker && c.symbol.toUpperCase().includes(ticker)) ||
        (name   && c.name.toLowerCase().includes(name.toLowerCase()))
      );
      const tag = exact ? `<span class="nr-coin-tag exact">exact match</span>`
                : close ? `<span class="nr-coin-tag close">similar</span>` : "";
      return `<div class="nr-coin ${exact ? "exact-match" : ""}">
        <img src="${c.thumb}" alt="" onerror="this.style.display='none'" />
        <span class="nr-coin-name">${c.name}</span>
        <span class="nr-coin-sym">${c.symbol.toUpperCase()}</span>
        ${c.market_cap_rank ? `<span class="nr-coin-rank">rank #${c.market_cap_rank}</span>` : ""}
        ${tag}
      </div>`;
    }).join("");
    cgEl.innerHTML = `<div class="nr-coin-list">${rows}</div>
      <div class="nr-clear" onclick="document.getElementById('nr-results').classList.add('hidden')">Clear results</div>`;
  }

  // Quick links
  const q = encodeURIComponent(ticker || name);
  document.getElementById("nr-links").innerHTML = [
    { label: "CoinGecko search",     href: `https://www.coingecko.com/en/search_redirect?query=${q}` },
    { label: "CoinMarketCap search", href: `https://coinmarketcap.com/currencies/${(ticker||name).toLowerCase()}/` },
    { label: ".com domain check",    href: `https://www.namecheap.com/domains/registration/results/?domain=${(name||ticker).toLowerCase().replace(/\s+/g,"")}.com` },
    { label: ".io domain check",     href: `https://www.namecheap.com/domains/registration/results/?domain=${(name||ticker).toLowerCase().replace(/\s+/g,"")}.io` },
  ].map(l => `<a class="nr-link" href="${l.href}" target="_blank" rel="noopener">${l.label} ↗</a>`).join("");
}


// ════════════════════════════════════════════════════════════════════════════
// TOKENOMICS VISUALIZER
// ════════════════════════════════════════════════════════════════════════════

const TOKE_BUCKETS = [
  { key: "deployer",   label: "Deployer / Founder", color: "#6c63ff", note: "Genesis wallet — controls contract initially" },
  { key: "reserve",    label: "Reserve / Treasury",  color: "#00d4aa", note: "Held for future use, ecosystem grants, etc." },
  { key: "community",  label: "Community / Test",    color: "#f59e0b", note: "Airdrops, test wallets, early users" },
];

let tokeState = {
  supply:     1_000_000,
  model:      "mintable+burnable",
  deployer:   80,
  reserve:    15,
  community:  5,
};

function initTokenomics() {
  // Seed from config if available
  const dist = state.tokenConfig?.distribution || {};
  const sup  = state.tokenConfig?.supply || {};
  if (dist.deployer  != null) tokeState.deployer   = dist.deployer;
  if (dist.reserve   != null) tokeState.reserve    = dist.reserve;
  if (dist.testWallets != null) tokeState.community = dist.testWallets;
  if (sup.initialSupply) tokeState.supply = sup.initialSupply;
  if (sup.model)         tokeState.model  = sup.model;

  document.getElementById("tk-supply").value = tokeState.supply;
  document.getElementById("tk-model").value  = tokeState.model;

  buildSliders();
  renderTokenomics();

  document.getElementById("tk-supply").addEventListener("input", e => {
    tokeState.supply = Math.max(1, parseInt(e.target.value) || 1);
    renderTokenomics();
  });
  document.getElementById("tk-model").addEventListener("change", e => {
    tokeState.model = e.target.value;
    renderTokenomics();
  });
}

function buildSliders() {
  const container = document.getElementById("tk-sliders");
  container.innerHTML = TOKE_BUCKETS.map(b => `
    <div class="toke-slider">
      <div class="toke-slider-header">
        <span class="toke-slider-label" style="color:${b.color}">${b.label}</span>
        <span class="toke-slider-val" id="tk-val-${b.key}">${tokeState[b.key]}%</span>
      </div>
      <input type="range" id="tk-range-${b.key}" min="0" max="100" value="${tokeState[b.key]}" />
    </div>
  `).join("");

  TOKE_BUCKETS.forEach(b => {
    document.getElementById(`tk-range-${b.key}`).addEventListener("input", e => {
      const val = parseInt(e.target.value);
      const delta = val - tokeState[b.key];
      tokeState[b.key] = val;

      // Absorb delta from the next bucket in rotation, clamp to [0,100]
      const others = TOKE_BUCKETS.filter(o => o.key !== b.key);
      for (const other of others) {
        const newVal = Math.max(0, Math.min(100, tokeState[other.key] - delta));
        const absorbed = tokeState[other.key] - newVal;
        tokeState[other.key] = newVal;
        document.getElementById(`tk-range-${other.key}`).value = newVal;
        document.getElementById(`tk-val-${other.key}`).textContent = `${newVal}%`;
        if (Math.abs(absorbed) >= Math.abs(delta)) break;
      }

      document.getElementById(`tk-val-${b.key}`).textContent = `${val}%`;
      renderTokenomics();
    });
  });
}

function renderTokenomics() {
  const sum = TOKE_BUCKETS.reduce((a, b) => a + tokeState[b.key], 0);
  const sumEl = document.getElementById("tk-sum");
  sumEl.textContent = `${sum}%`;
  sumEl.className = sum === 100 ? "tk-sum-ok" : "tk-sum-err";

  drawDonut();
  renderTokeTable();
  renderTokeLegend();
}

function drawDonut() {
  const svg = document.getElementById("tk-donut");
  const cx = 100, cy = 100, r = 80, sw = 36;
  const circ = 2 * Math.PI * r;
  const sum = TOKE_BUCKETS.reduce((a, b) => a + tokeState[b.key], 0) || 100;

  // Remove old segments
  svg.querySelectorAll(".tk-seg").forEach(el => el.remove());

  let offset = 0; // start at top (rotated -90deg via transform)
  TOKE_BUCKETS.forEach(b => {
    const pct  = tokeState[b.key] / sum;
    const dash = circ * pct;
    const gap  = circ * (1 - pct);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "tk-seg");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", b.color);
    circle.setAttribute("stroke-width", sw);
    circle.setAttribute("stroke-dasharray", `${dash} ${gap}`);
    circle.setAttribute("stroke-dashoffset", -offset);
    circle.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
    circle.setAttribute("opacity", tokeState[b.key] === 0 ? "0" : "1");
    svg.appendChild(circle);

    offset += dash;
  });

  // Center label
  let label = svg.querySelector(".tk-center-label");
  if (!label) {
    label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "tk-center-label");
    label.setAttribute("x", cx);
    label.setAttribute("y", cy + 6);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#e8eaf0");
    label.setAttribute("font-size", "14");
    label.setAttribute("font-family", "sans-serif");
    svg.appendChild(label);
  }
  label.textContent = Number(tokeState.supply).toLocaleString();
}

function renderTokeLegend() {
  document.getElementById("tk-legend").innerHTML = TOKE_BUCKETS.map(b => `
    <div class="toke-legend-item">
      <div class="toke-legend-dot" style="background:${b.color}"></div>
      <span style="flex:1">${b.label}</span>
      <span style="font-family:var(--mono);font-size:12px">${tokeState[b.key]}%</span>
    </div>
  `).join("");
}

function renderTokeTable() {
  const supply = tokeState.supply;
  document.getElementById("tk-tbody").innerHTML = TOKE_BUCKETS.map(b => {
    const tokens = Math.round(supply * tokeState[b.key] / 100);
    return `<tr>
      <td><span style="color:${b.color};font-weight:600">${b.label}</span></td>
      <td>${tokeState[b.key]}%</td>
      <td>${tokens.toLocaleString()}</td>
      <td style="color:var(--text-muted);font-size:12px;font-family:var(--font)">${b.note}</td>
    </tr>`;
  }).join("");
}

// Wire up tokenomics when More tab is first clicked
let tokeInited = false;
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "more" && !tokeInited) {
      tokeInited = true;
      initTokenomics();
    }
  });
});


// ════════════════════════════════════════════════════════════════════════════
// INFO ICON TOOLTIPS
// ════════════════════════════════════════════════════════════════════════════

const TIPS = {
  "token-name": {
    title: "Token Name",
    body: "The human-readable name stored on-chain. Defined in <code>token-config.json → identity.name</code> and passed to the contract constructor at deploy time. Immutable after deployment — it's written into the contract bytecode.",
    links: [
      { label: "View on Lineascan ↗", href: "https://lineascan.build/address/0x5291Ae7F79594214086Deaae0626dD6cbD5FB488#readContract" },
    ],
  },
  "symbol": {
    title: "Symbol / Ticker",
    body: "The short trading symbol (e.g. MAC). Stored on-chain — every wallet, block explorer, and exchange reads this to label your token. Defined in <code>token-config.json → identity.symbol</code>.",
    links: [
      { label: "ERC-20 spec ↗", href: "https://eips.ethereum.org/EIPS/eip-20" },
    ],
  },
  "blockchain": {
    title: "Blockchain — Linea",
    body: "The network where the contract is deployed. Linea is a ConsenSys zkEVM Layer-2 that settles to Ethereum mainnet. Low gas (~$0.10–0.50 to deploy), high dev credibility, same tooling as Ethereum.",
    links: [
      { label: "Linea docs ↗", href: "https://docs.linea.build" },
      { label: "Lineascan ↗", href: "https://lineascan.build" },
      { label: "Linea bridge ↗", href: "https://bridge.linea.build" },
    ],
  },
  "supply-model": {
    title: "Supply Model",
    body: "<strong>mintable</strong> — the owner can create new tokens after deploy.<br><strong>burnable</strong> — any holder can destroy their own tokens.<br><strong>mintable+burnable</strong> — both. These are optional extensions from OpenZeppelin layered onto the ERC-20 base.",
    links: [
      { label: "OpenZeppelin ERC20Burnable ↗", href: "https://docs.openzeppelin.com/contracts/5.x/api/token/erc20#ERC20Burnable" },
      { label: "View contract ↗", href: "https://lineascan.build/address/0x5291Ae7F79594214086Deaae0626dD6cbD5FB488#code" },
    ],
  },
  "initial-supply": {
    title: "Initial Supply",
    body: "Tokens minted to the deployer wallet when the constructor runs — a one-time event at deploy. Set in <code>token-config.json → supply.initialSupply</code>. If mintable, more can be created later via the <code>mint()</code> function.",
    links: [
      { label: "View deployer wallet ↗", href: "https://lineascan.build/address/0xC4E206B6ddc8A91780091594ac3e999B3Da6e707" },
    ],
  },
  "stable": {
    title: "Stablecoin-Lite",
    body: "An optional future feature: a soft peg to $1 USD using a Chainlink price oracle. Currently <strong>disabled</strong> — MAC has no price mechanism yet. Enabling it would require wiring up a Chainlink feed in the contract and adding peg-enforcement logic.",
    links: [
      { label: "Chainlink price feeds ↗", href: "https://docs.chain.link/data-feeds" },
    ],
  },
  "contract-address": {
    title: "Contract Address",
    body: "The permanent on-chain location of the deployed contract bytecode. This address never changes. Anyone with this address can read public state (name, symbol, total supply, any wallet balance) — no wallet needed.",
    links: [
      { label: "View on Lineascan ↗", href: "https://lineascan.build/address/0x5291Ae7F79594214086Deaae0626dD6cbD5FB488" },
    ],
  },
  "contract-status": {
    title: "Contract Status",
    body: "The Pausable extension (from OpenZeppelin) lets the contract owner freeze all token transfers in an emergency. <strong>Active</strong> = transfers are live. <strong>Paused</strong> = all transfers are blocked until the owner unpauses. Connect your owner wallet to toggle.",
    links: [
      { label: "OpenZeppelin Pausable ↗", href: "https://docs.openzeppelin.com/contracts/5.x/api/security#Pausable" },
    ],
  },
  "deploy-tx": {
    title: "Deploy Transaction",
    body: "The transaction hash that created this contract. A contract is just a special transaction — the bytecode is the transaction data. This TX is permanent and verifiable on Lineascan.",
    links: [
      { label: "View TX on Lineascan ↗", href: "https://lineascan.build/tx/0x69c2801da046fcc74b755e50edac8d045279ba9743bf972e0a78b32ca6d0a664" },
    ],
  },
  "token-config": {
    title: "Token Config",
    body: "Values defined locally in <code>config/token-config.json</code>. At deploy, <code>scripts/deploy.js</code> reads this file and passes <code>name</code>, <code>symbol</code>, and <code>initialSupply</code> to the contract constructor. Once deployed, those values are written on-chain and are immutable.",
    links: [
      { label: "View contract source ↗", href: "https://lineascan.build/address/0x5291Ae7F79594214086Deaae0626dD6cbD5FB488#code" },
      { label: "ERC-20 standard ↗", href: "https://eips.ethereum.org/EIPS/eip-20" },
    ],
  },
  "network-config": {
    title: "Network Config",
    body: "Defined in <code>config/networks.json</code>. The <code>active</code> field tells the deploy script which chain to target. Hardhat reads the matching RPC URL and chain ID — combined with the private key in <code>.env</code> — to connect and broadcast.",
    links: [
      { label: "Linea RPC docs ↗", href: "https://docs.linea.build/developers/quickstart/info-contracts" },
    ],
  },
};

// ── Tooltip engine ─────────────────────────────────────────────────────────
(function initTooltips() {
  const tooltip  = document.getElementById("info-tooltip");
  const ttTitle  = document.getElementById("tt-title");
  const ttBody   = document.getElementById("tt-body");
  const ttLinks  = document.getElementById("tt-links");
  let hideTimer  = null;

  function showTip(iconEl) {
    const tipId = iconEl.dataset.tip;
    const tip   = TIPS[tipId];
    if (!tip) return;

    clearTimeout(hideTimer);

    ttTitle.textContent = tip.title;
    ttBody.innerHTML    = tip.body;
    ttLinks.innerHTML   = (tip.links || []).map(l =>
      `<a class="info-tooltip-link" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`
    ).join("");

    // Position: show briefly off-screen to measure height, then place
    tooltip.style.left   = "-9999px";
    tooltip.style.top    = "-9999px";
    tooltip.style.opacity = "0";
    tooltip.classList.add("visible");

    requestAnimationFrame(() => {
      const rect = iconEl.getBoundingClientRect();
      const tw   = tooltip.offsetWidth  || 300;
      const th   = tooltip.offsetHeight || 120;

      // Prefer above; fall back to below
      let top = rect.top - th - 10;
      if (top < 8) top = rect.bottom + 8;

      // Clamp horizontally
      let left = rect.left + rect.width / 2 - tw / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));

      tooltip.style.left    = `${left}px`;
      tooltip.style.top     = `${top}px`;
      tooltip.style.opacity = "";  // let CSS transition take over
    });
  }

  function hideTip() {
    hideTimer = setTimeout(() => tooltip.classList.remove("visible"), 80);
  }

  // Wire up all current and future icons via delegation
  document.addEventListener("mouseover", e => {
    const icon = e.target.closest(".info-icon");
    if (icon) showTip(icon);
  });

  document.addEventListener("mouseout", e => {
    if (e.target.closest(".info-icon")) hideTip();
  });

  // Keep visible when hovering the tooltip itself
  tooltip.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  tooltip.addEventListener("mouseleave", hideTip);
})();


// ── Start ─────────────────────────────────────────────────────────────────────
init().catch(console.error);
