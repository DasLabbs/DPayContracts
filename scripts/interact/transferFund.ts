import { ethers } from "ethers";
import { Web3Utils } from "../../utils";

const main = async () => {
  const web3Utils = new Web3Utils({
    delayStep: 1000,
    redeploy: false,
  });

  const vault = await web3Utils.getContract("Vault");
  const token = await web3Utils.getContract("Token");

  const amount = 10;
  await token.approve(
    await vault.getAddress(),
    ethers.parseEther(amount.toString())
  );

  const tx = await vault.transferFunds(
    await token.getAddress(),
    ethers.parseEther(amount.toString())
  );
  await tx.wait();
  console.log("Fund transferred successfully:", tx.hash);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
