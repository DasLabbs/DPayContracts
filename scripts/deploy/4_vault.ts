import { Web3Utils } from "../../utils";

const main = async () => {
  const web3Utils = new Web3Utils({
    delayStep: 1000,
    redeploy: false,
  });

  const token = await web3Utils.getContract("Token");
  const rewardManager = await web3Utils.getContract("RewardManager");
  const vault = await web3Utils.deployContract("Vault", [
    await token.getAddress(),
    await rewardManager.getAddress(),
  ]);

  rewardManager.grantRole(
    rewardManager.POINTS_MANAGER_ROLE(),
    await vault.getAddress()
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
