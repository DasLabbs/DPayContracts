import { ethers } from "ethers";
import { Web3Utils } from "../utils";

const main = async () => {
  const web3Utils = new Web3Utils({
    delayStep: 1000,
    redeploy: false,
  });

  await web3Utils.deployContract("Token", [
    "USD Test token",
    "USDT",
    ethers.parseEther("1000000000"),
  ]);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
