import { ethers } from "ethers";
import { Web3Utils } from "../../utils";

const main = async () => {
  const web3Utils = new Web3Utils({
    delayStep: 1000,
    redeploy: false,
  });

  const rewardVault = await web3Utils.getContract("RewardVault");
  const rewardManager = await web3Utils.deployContract("RewardManager", [
    await rewardVault.getAddress(),
  ]);

  rewardVault.grantRole(
    rewardVault.CLAIMER_ROLE(),
    await rewardManager.getAddress()
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
