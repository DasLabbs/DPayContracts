import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("Starting deployment...\n");

  // Get deployer address
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // 1. Deploy OrderNFT
  console.log("Deploying OrderNFT...");
  const OrderNFT = await ethers.getContractFactory("OrderNFT");
  // const orderNFT = await OrderNFT.deploy(
  //   "DPay Order NFT",
  //   "DPAY-ORDER",
  //   deployer.address
  // );
  // await orderNFT.waitForDeployment();
  const orderNFT = OrderNFT.attach(
    "0xfA1300A3D86381dEDa5062b12a9FcF1a6C85e043"
  );
  const orderNFTAddress = await orderNFT.getAddress();
  console.log("OrderNFT deployed to:", orderNFTAddress);

  // Grant MINTER_ROLE to deployer for testing
  // const MINTER_ROLE = await orderNFT.MINTER_ROLE();
  // await orderNFT.grantRole(MINTER_ROLE, deployer.address);
  // console.log("Granted MINTER_ROLE to deployer\n");

  // 2. Deploy RewardVault (UUPS upgradeable)
  // console.log("Deploying RewardVaultV1 implementation...");
  // const RewardVaultV1 = await ethers.getContractFactory("RewardVaultV1");
  // const rewardVaultV1 = await RewardVaultV1.deploy();
  // await rewardVaultV1.waitForDeployment();
  // console.log("RewardVaultV1 implementation deployed");

  // console.log("Deploying RewardVault proxy...");
  const RewardVault = await ethers.getContractFactory("RewardVault");
  // const rewardVault = await upgrades.deployProxy(
  //   RewardVault,
  //   [deployer.address],
  //   {
  //     initializer: "initialize",
  //     kind: "uups",
  //   }
  // );
  // await rewardVault.waitForDeployment();
  // const rewardVaultAddress = await rewardVault.getAddress();

  const rewardVault = RewardVault.attach(
    "0x34d404841a6389ff767723948F70A26e3397A951"
  );
  const rewardVaultAddress = await rewardVault.getAddress();
  // console.log("RewardVault proxy deployed to:", rewardVaultAddress);

  // // Grant TREASURY_ROLE to deployer for testing
  // const TREASURY_ROLE = await rewardVault.TREASURY_ROLE();
  // await rewardVault.grantRole(TREASURY_ROLE, deployer.address);
  // console.log("Granted TREASURY_ROLE to deployer\n");

  // 3. Deploy ClaimReward
  console.log("Deploying ClaimReward...");
  const ClaimReward = await ethers.getContractFactory("ClaimReward");
  const claimReward = await ClaimReward.deploy(
    rewardVaultAddress,
    orderNFTAddress,
    deployer.address
  );
  await claimReward.waitForDeployment();
  const claimRewardAddress = await claimReward.getAddress();
  console.log("ClaimReward deployed to:", claimRewardAddress);

  // 4. Grant CLAIMER_ROLE to ClaimReward on RewardVault
  console.log("Granting CLAIMER_ROLE to ClaimReward...");
  const CLAIMER_ROLE = await (rewardVault as any).CLAIMER_ROLE();
  await (rewardVault as any).grantRole(CLAIMER_ROLE, claimRewardAddress);
  console.log("Granted CLAIMER_ROLE to ClaimReward");

  // 5. Grant SIGNER_ROLE to deployer for testing
  console.log("Granting SIGNER_ROLE to deployer for testing...");
  const SIGNER_ROLE = await claimReward.SIGNER_ROLE();
  await claimReward.grantRole(SIGNER_ROLE, deployer.address);
  console.log("Granted SIGNER_ROLE to deployer\n");

  console.log("\n=== Deployment Summary ===");
  console.log("OrderNFT:", orderNFTAddress);
  console.log("RewardVault Proxy:", rewardVaultAddress);
  console.log(
    "RewardVault Implementation:",
    await upgrades.erc1967.getImplementationAddress(rewardVaultAddress)
  );
  console.log("ClaimReward:", claimRewardAddress);
  console.log("Deployer Address:", deployer.address);
  console.log("\n=== Contract Setup ===");
  console.log("✓ OrderNFT: MINTER_ROLE granted to deployer");
  console.log("✓ RewardVault: TREASURY_ROLE granted to deployer");
  console.log("✓ RewardVault: CLAIMER_ROLE granted to ClaimReward");
  console.log("✓ ClaimReward: SIGNER_ROLE granted to deployer");
  console.log("\nDeployment completed successfully!\n");

  // Save addresses to a file for easy reference
  const deploymentInfo = {
    network: await ethers.provider.getNetwork().then((n) => n.name),
    deployer: deployer.address,
    contracts: {
      orderNFT: orderNFTAddress,
      rewardVault: rewardVaultAddress,
      claimReward: claimRewardAddress,
    },
    roles: {
      minter: deployer.address,
      treasury: deployer.address,
      signer: deployer.address,
    },
  };

  console.log("Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
