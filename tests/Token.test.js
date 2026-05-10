import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("Token", function () {
  let token, owner, alice, bob;
  const NAME = "TestToken";
  const SYMBOL = "TTK";
  const INITIAL_SUPPLY = 1_000_000n;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(NAME, SYMBOL, INITIAL_SUPPLY, owner.address);
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets name and symbol", async function () {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("mints initial supply to owner", async function () {
      const supply = await token.totalSupply();
      const expected = INITIAL_SUPPLY * 10n ** 18n;
      expect(supply).to.equal(expected);
      expect(await token.balanceOf(owner.address)).to.equal(expected);
    });
  });

  describe("Mint", function () {
    it("owner can mint", async function () {
      const amount = ethers.parseEther("500");
      await token.connect(owner).mint(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("non-owner cannot mint", async function () {
      await expect(
        token.connect(alice).mint(bob.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burn", function () {
    it("holder can burn their own tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await token.connect(owner).mint(alice.address, mintAmount);

      const burnAmount = ethers.parseEther("300");
      await token.connect(alice).burn(burnAmount);

      expect(await token.balanceOf(alice.address)).to.equal(mintAmount - burnAmount);
    });
  });

  describe("Pause", function () {
    it("owner can pause and unpause", async function () {
      await token.connect(owner).pause();
      expect(await token.paused()).to.be.true;

      await token.connect(owner).unpause();
      expect(await token.paused()).to.be.false;
    });

    it("transfers are blocked when paused", async function () {
      await token.connect(owner).pause();
      await expect(
        token.connect(owner).transfer(alice.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Transfer", function () {
    it("transfers tokens between accounts", async function () {
      const amount = ethers.parseEther("250");
      await token.connect(owner).transfer(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });
  });
});
