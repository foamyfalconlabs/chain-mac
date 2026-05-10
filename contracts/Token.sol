// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─── SKELETON — fill in token-config.json first, then configure below ─────────
//
// Dependencies (install via npm after running scripts/setup.sh):
//   @openzeppelin/contracts
//
// Swap out the import path if using Foundry:
//   forge install OpenZeppelin/openzeppelin-contracts

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ─── OPTIONAL: uncomment for role-based access instead of single owner ─────────
// import "@openzeppelin/contracts/access/AccessControl.sol";
// bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
// bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

contract Token is ERC20, ERC20Burnable, ERC20Pausable, Ownable {

    // ── Stablecoin-lite state (optional — set stablecoinLite.enabled = true in config) ──
    // uint256 public pegPrice;        // e.g. 1e8 = $1.00 in 8-decimal Chainlink format
    // address public priceOracle;     // Chainlink AggregatorV3Interface address

    // ── Transfer fee state (optional — set features.transferFee = true) ─────────────────
    // uint256 public transferFeeBps;  // basis points, e.g. 50 = 0.5%
    // address public feeRecipient;

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────────────────
    // TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY come from .env via deploy script
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,      // in full tokens (script multiplies by 10**decimals)
        address _initialOwner
    )
        ERC20(_name, _symbol)
        Ownable(_initialOwner)
    {
        if (_initialSupply > 0) {
            _mint(_initialOwner, _initialSupply * 10 ** decimals());
        }
    }

    // ── Mint ─────────────────────────────────────────────────────────────────────────────
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Minted(to, amount);
    }

    // ── Pause / Unpause ───────────────────────────────────────────────────────────────────
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ── Stablecoin-lite: manual peg price ─────────────────────────────────────────────────
    // function setPegPrice(uint256 _price) external onlyOwner {
    //     pegPrice = _price;
    // }

    // ── Transfer fee hook ─────────────────────────────────────────────────────────────────
    // Override _update to inject fee logic before calling super._update()
    // function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
    //     if (transferFeeBps > 0 && from != address(0) && to != feeRecipient) {
    //         uint256 fee = (value * transferFeeBps) / 10000;
    //         super._update(from, feeRecipient, fee);
    //         value -= fee;
    //     }
    //     super._update(from, to, value);
    // }

    // Required override for ERC20Pausable + ERC20 diamond inheritance
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
