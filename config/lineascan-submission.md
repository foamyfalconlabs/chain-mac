# Lineascan Token Info Submission

Form: https://lineascan.build/contactus → "Update Token Info"

---

## Required Fields

| Field              | Value |
|--------------------|-------|
| Contract Address   | `0x5291Ae7F79594214086Deaae0626dD6cbD5FB488` |
| Token Name         | Money Access Crypto |
| Token Symbol       | MAC |
| Decimals           | 18 |
| Logo Image         | `mac-logo-256.png` (256×256 PNG) ✅ ready |

---

## Optional Fields (fill in when ready)

| Field       | Value |
|-------------|-------|
| Website     | TBD — future landing page or GitHub Pages |
| Email       | mac@foamyfalcon.com |
| Twitter/X   | TBD |
| Telegram    | TBD |
| Discord     | TBD |
| GitHub      | TBD |
| Description | See below |

---

## Description (copy-paste ready)

> Money Access Crypto (MAC) is an ERC-20 token deployed on Linea Mainnet. A hands-on learning and demonstration project exploring real on-chain token deployment, smart contract development, and crypto infrastructure. Built with Hardhat, OpenZeppelin, and ethers.js. Mintable, burnable, and pausable. Chain ID 59144.

---

## Logo Checklist (before submitting)

**Main logo** (`mac-logo.png`) — keep for dashboard and branding ✅

**Lineascan submission icon** — needs to be simpler/smaller:
- [ ] Generate icon-only version: flat circle, navy blue, rainbow stripes top half, bold white MAC, no text, no swoosh, transparent background, 256×256 PNG
- [ ] Use prompt: *"Same design as current MAC logo. Icon-only version — remove 'Money Access Crypto' text entirely. MAC lettering larger and centered. Flat design, no gradients, no shadows. Transparent background, 1024×1024 PNG."*
- [ ] Save as `mac-icon-256.png` in `coin-poc/`
- [ ] Resize to 256×256 via: `sips -z 256 256 mac-icon.png --out mac-icon-256.png`

**Socials (create before submitting):**
- [ ] Twitter/X — @MACtoken or @MoneyAccessCrypto
- [ ] GitHub — see note below before adding URL

## GitHub — Public Identity Decision

**Decision needed:** coin-poc repo is currently under `bnewshel` which is personally identifying.

Options:
- Keep under `bnewshel` — simple, already there
- Move to a new public-facing account — cleaner separation for MAC and other future public projects

**TODO:** Create a non-identifying GitHub account (e.g. `mactoken`, `foamyfalconlabs`, or a neutral handle) to use for:
- coin-poc / MAC token
- Other public crypto / side project repos
- Any public work you don't want tied to your real name by default

Once account is created: transfer or re-push coin-poc repo there, then add that GitHub URL to this submission.

---

## Icon — Future Task

**Current logo** (`mac-logo.png`) — full color, rainbow + MAC — use for dashboard, branding, Lineascan main logo ✅

**Lineascan / token list icon** — future task:
- [ ] Create a **1-color vector icon** — single color (white or navy), simplified MAC mark or "M" shape, works at any size
- [ ] Format: SVG (vector) + PNG export at 32, 64, 256px
- [ ] Style: think Bitcoin ₿ or Ethereum ⟠ — one shape, instantly recognizable, no color dependency
- [ ] Prompt direction: *"Single color vector icon for MAC cryptocurrency. Simple geometric 'M' or abstract mark. Works as white-on-dark or dark-on-white. SVG, no gradients, no fill colors, stroke only or solid single shape."*
- [ ] Use for: Lineascan token list, CoinGecko, wallet displays, favicon

---

## Notes

- Do NOT submit until logo is finalized
- Lineascan review takes ~3–7 days
- Same submission removes "Reputation UNKNOWN" warning in MetaMask
- After submitting here, next step is Linea official token list (GitHub PR)
