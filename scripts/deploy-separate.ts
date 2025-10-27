import { ethers, upgrades } from "hardhat";

/**
 * This script demonstrates deploying contracts separately
 * Useful for testing or deploying to a live network
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Configuration
  const ORDER_NFT_NAME = "DPay Order NFT";
  const ORDER_NFT_SYMBOL = "DPAY-ORDER";
  const ADMIN = deployer.address; // Or specify a different address

  console.log("=== Step 1: Deploy OrderNFT ===\n");
  const OrderNFT = await ethers.getContractFactory("OrderNFT");
  const orderNFT = await OrderNFT.deploy(
    ORDER_NFT_NAME,
    ORDER_NFT_SYMBOL,
    ADMIN
  );
  await orderNFT.waitForDeployment();
  const orderNFTAddress = await orderNFT.getAddress();
  console.log("OrderNFT deployed to:", orderNFTAddress);

  const MINTER_ROLE = await orderNFT.MINTER_ROLE();
  await orderNFT.grantRole(MINTER_ROLE, deployer.address);
  console.log("✓ MINTER_ROLE granted to deployer\n");

  console.log("=== Step 2: Deploy RewardVault (UUPS) ===\n");
  const RewardVault = await ethers.getContractFactory("RewardVault");
  const rewardVault = await upgrades.deployProxy(RewardVault, [ADMIN], {
    initializer: "initialize",
    kind: "uups",
  });
  await rewardVault.waitForDeployment();
  const rewardVaultAddress = await rewardVault.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    rewardVaultAddress
  );
  console.log("RewardVault proxy deployed to:", rewardVaultAddress);
  console.log("RewardVault implementation at:", implementationAddress);

  const TREASURY_ROLE = await rewardVault.TREASURY_ROLE();
  await rewardVault.grantRole(TREASURY_ROLE, deployer.address);
  console.log("✓ TREASURY_ROLE granted to deployer\n");

  console.log("=== Step 3: Deploy ClaimReward ===\n");
  const ClaimReward = await ethers.getContractFactory("ClaimReward");
  const claimReward = await ClaimReward.deploy(
    rewardVaultAddress,
    orderNFTAddress,
    ADMIN
  );
  await claimReward.waitForDeployment();
  const claimRewardAddress = await claimReward.getAddress();
  console.log("ClaimReward deployed to:", claimRewardAddress);

  const SIGNER_ROLE = await claimReward.SIGNER_ROLE();
  await claimReward.grantRole(SIGNER_ROLE, deployer.address);
  console.log("✓ SIGNER_ROLE granted to deployer\n");

  console.log("=== Step 4: Setup Role Permissions ===\n");
  const CLAIMER_ROLE = await rewardVault.CLAIMER_ROLE();
  await rewardVault.grantRole(CLAIMER_ROLE, claimRewardAddress);
  console.log("✓ CLAIMER_ROLE granted to ClaimReward\n");

  console.log("\n=== Deployment Complete ===\n");
  console.log("Contracts:");
  console.log("  OrderNFT:", orderNFTAddress);
  console.log("  RewardVault:", rewardVaultAddress);
  console.log("  ClaimReward:", claimRewardAddress);
  console.log("\nNext steps:");
  console.log("1. Fund RewardVault with tokens using depositTokens()");
  console.log("2. Mint order NFTs using mintOrder() on OrderNFT");
  console.log("3. Sign claim messages and call claimReward() on ClaimReward");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
