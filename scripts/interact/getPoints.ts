import { ethers } from "hardhat";
import { Web3Utils } from "../../utils";

const main = async () => {
  const [deployer] = await ethers.getSigners();
  const web3Utils = new Web3Utils({
    delayStep: 1000,
    redeploy: false,
  });

  const rewardManager = await web3Utils.getContract("RewardManager");
  const points = await rewardManager.userPoints(deployer.address);
};

main();
