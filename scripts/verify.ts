import { ethers } from "hardhat";

/**
 * Script to verify contract setup after deployment
 * Usage: npx hardhat run scripts/verify.ts --network <network>
 */

async function main() {
  // Load contract addresses from command line or environment
  const [deployer] = await ethers.getSigners();
  console.log("Verifying deployment for deployer:", deployer.address);

  // Get addresses from environment or hardcode for testing
  const addresses = {
    orderNFT: process.env.ORDER_NFT_ADDRESS || "0x...",
    rewardVault: process.env.REWARD_VAULT_ADDRESS || "0x...",
    claimReward: process.env.CLAIM_REWARD_ADDRESS || "0x...",
  };

  console.log("\nContract Addresses:");
  console.log("OrderNFT:", addresses.orderNFT);
  console.log("RewardVault:", addresses.rewardVault);
  console.log("ClaimReward:", addresses.claimReward);
  console.log("\n");

  // Verify OrderNFT
  console.log("=== Verifying OrderNFT ===");
  const orderNFT = await ethers.getContractAt("OrderNFT", addresses.orderNFT);
  const minterRole = await orderNFT.MINTER_ROLE();
  const hasMinterRole = await orderNFT.hasRole(minterRole, deployer.address);
  console.log("Deployer has MINTER_ROLE:", hasMinterRole);
  const totalSupply = await orderNFT.totalSupply();
  console.log("Total NFTs minted:", totalSupply.toString());

  // Verify RewardVault
  console.log("\n=== Verifying RewardVault ===");
  const rewardVault = await ethers.getContractAt(
    "RewardVault",
    addresses.rewardVault
  );
  const treasuryRole = await rewardVault.TREASURY_ROLE();
  const hasTreasuryRole = await rewardVault.hasRole(
    treasuryRole,
    deployer.address
  );
  console.log("Deployer has TREASURY_ROLE:", hasTreasuryRole);

  const claimerRole = await rewardVault.CLAIMER_ROLE();
  const hasClaimerRole = await rewardVault.hasRole(
    claimerRole,
    addresses.claimReward
  );
  console.log("ClaimReward has CLAIMER_ROLE:", hasClaimerRole);

  const adminRole = await rewardVault.ADMIN_ROLE();
  const hasAdminRole = await rewardVault.hasRole(adminRole, deployer.address);
  console.log("Deployer has ADMIN_ROLE:", hasAdminRole);

  // Verify ClaimReward
  console.log("\n=== Verifying ClaimReward ===");
  const claimReward = await ethers.getContractAt(
    "ClaimReward",
    addresses.claimReward
  );
  const signerRole = await claimReward.SIGNER_ROLE();
  const hasSignerRole = await claimReward.hasRole(signerRole, deployer.address);
  console.log("Deployer has SIGNER_ROLE:", hasSignerRole);

  const vaultAddress = await claimReward.vault();
  console.log("Connected vault:", vaultAddress);
  const correctVault =
    vaultAddress.toLowerCase() === addresses.rewardVault.toLowerCase();
  console.log("Connected to correct vault:", correctVault);

  const minPoints = await claimReward.minPointsToClaim();
  console.log("Minimum points to claim:", minPoints.toString());
  if (minPoints > 0) {
    console.log("Points validation is ENABLED");
  } else {
    console.log("Points validation is DISABLED");
  }

  console.log("\n=== Verification Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
