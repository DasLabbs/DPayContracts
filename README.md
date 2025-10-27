# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

Deployment Info: {
  "network": "somnia",
  "deployer": "0x5A158E00691E531cc0b999291b05Ad0bE3857A91",
  "contracts": {
    "orderNFT": "0xfA1300A3D86381dEDa5062b12a9FcF1a6C85e043",
    "rewardVault": "0x34d404841a6389ff767723948F70A26e3397A951",
    "claimReward": "0x820B1F836517a25fB4C843dDF12592eaa92844E8"
  },
  "roles": {
    "minter": "0x5A158E00691E531cc0b999291b05Ad0bE3857A91",
    "treasury": "0x5A158E00691E531cc0b999291b05Ad0bE3857A91",
    "signer": "0x5A158E00691E531cc0b999291b05Ad0bE3857A91"
  }
}