import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ZeroAddress } from "ethers";

const DeployModule = buildModule("DeployModule", (m) => {
  // Admin address - deployer will be the admin
  const deployer = m.getAccount(0);

  // 1. Deploy OrderNFT
  const orderNFT = m.contract("OrderNFT", [
    "DPay Order NFT",
    "DPAY-ORDER",
    deployer,
  ]);

  // 2. Deploy RewardVault implementation (the base contract)
  // Note: We deploy the base RewardVault contract, not RewardVaultV1
  // RewardVaultV1 extends RewardVault and is used for upgrades
  const rewardVaultImpl = m.contract("RewardVault");

  // 3. Deploy ClaimReward
  // Note: We'll update vault address after proxy deployment
  const claimReward = m.contract("ClaimReward", [
    ZeroAddress, // Updated after vault proxy deployment
    orderNFT,
    deployer,
  ]);

  return {
    orderNFT,
    rewardVaultImpl,
    claimReward,
  };
});

export default DeployModule;
