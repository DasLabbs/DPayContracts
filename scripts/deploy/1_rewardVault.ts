import hardhat, { ethers, upgrades } from "hardhat";
import { Web3Utils } from "../../utils";

const main = async () => {
  const web3Utils = new Web3Utils({
    delayStep: 1000,
    redeploy: false,
  });

  const [deployer] = await ethers.getSigners();
  const RewardVault = await ethers.getContractFactory("RewardVault");
  const rewardVault = await upgrades.deployProxy(
    RewardVault,
    [deployer.address],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await rewardVault.waitForDeployment();
  const rewardVaultAddress = await rewardVault.getAddress();
  web3Utils.db.write(hardhat.network.name, "RewardVault", rewardVaultAddress);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
