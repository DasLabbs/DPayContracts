import { ethers } from "hardhat";

/**
 * Helper script to interact with deployed contracts
 * Usage: npx hardhat run scripts/interact.ts --network <network>
 */

async function main() {
  const [deployer, user] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User:", user.address);

  // Load contract addresses
  const addresses = {
    orderNFT: process.env.ORDER_NFT_ADDRESS || "0x...",
    rewardVault: process.env.REWARD_VAULT_ADDRESS || "0x...",
    claimReward: process.env.CLAIM_REWARD_ADDRESS || "0x...",
  };

  if (addresses.orderNFT === "0x...") {
    console.log(
      "Please set contract addresses in environment variables or modify this script"
    );
    process.exit(1);
  }

  // Get contracts
  const rewardVault = await ethers.getContractAt(
    "RewardVault",
    addresses.rewardVault
  );
  const claimReward = await ethers.getContractAt(
    "ClaimReward",
    addresses.claimReward
  );

  console.log("\n=== Example Operations ===\n");

  // Example 1: Check user's total points
  try {
    const totalPoints = await claimReward.calculateTotalPoints(user.address);
    console.log("User total points:", totalPoints.toString());
  } catch (error) {
    console.log("Could not calculate points (no NFTs minted yet)");
  }

  // Example 2: Check available points
  try {
    const availablePoints = await claimReward.getAvailablePoints(user.address);
    console.log("User available points:", availablePoints.toString());
  } catch (error) {
    console.log("Could not get available points");
  }

  // Example 3: Check user's nonce
  const nonce = await claimReward.getUserNonce(user.address);
  console.log("User nonce:", nonce.toString());

  // Example 4: Check vault balance for a token
  const tokenAddress = process.env.TOKEN_ADDRESS || "0x...";
  if (tokenAddress !== "0x...") {
    const balance = await rewardVault.getTokenBalance(tokenAddress);
    console.log("Vault token balance:", balance.toString());
  }

  console.log("\n=== Example Minting Order ===\n");
  console.log("To mint an order NFT:");
  console.log("const tx = await orderNFT.mintOrder(");
  console.log("  userAddress,  // recipient");
  console.log("  productId,    // e.g., 1");
  console.log("  amount,       // e.g., 10");
  console.log("  price,        // e.g., parseEther('1')");
  console.log("  totalPrice    // e.g., parseEther('10')");
  console.log(");");

  console.log("\n=== Example Depositing Tokens ===\n");
  console.log("To deposit tokens into vault:");
  console.log("1. Approve tokens to vault:");
  console.log("await token.approve(vaultAddress, amount);");
  console.log("2. Deposit:");
  console.log("await rewardVault.depositTokens(tokenAddress, amount);");

  console.log("\n=== Example Claiming Rewards ===\n");
  console.log("To claim rewards, you need:");
  console.log("1. A valid signature from a SIGNER");
  console.log("2. Correct nonce");
  console.log("3. Valid deadline");
  console.log("4. Sufficient points (if enabled)");
  console.log("\nawait claimReward.claimReward(claimData, signature);");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
