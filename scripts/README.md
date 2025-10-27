# Deployment Scripts

This directory contains deployment scripts for the DPay contract suite.

## Scripts

### 1. `deploy.ts` - Complete Deployment
Deploys all contracts and sets up all necessary roles automatically.

```bash
# Deploy to local network
npx hardhat run scripts/deploy.ts

# Deploy to a specific network
npx hardhat run scripts/deploy.ts --network <network-name>

# Deploy using ignition (recommended for testing)
npx hardhat ignition deploy ignition/modules/deploy.ts
```

### 2. `deploy-separate.ts` - Step-by-Step Deployment
Deploys contracts one by one with detailed output at each step.

```bash
npx hardhat run scripts/deploy-separate.ts --network <network-name>
```

## Deployment Order

The contracts must be deployed in this order:

1. **OrderNFT** - ERC721 for storing order information
2. **RewardVault** - Upgradeable vault for reward tokens (UUPS pattern)
3. **ClaimReward** - Reward claiming contract with signature verification

## Post-Deployment Setup

After deployment, you'll need to:

1. **Grant CLAIMER_ROLE** to ClaimReward on RewardVault:
```solidity
await rewardVault.grantRole(CLAIMER_ROLE, claimRewardAddress);
```

2. **Grant MINTER_ROLE** to backend service on OrderNFT:
```solidity
await orderNFT.grantRole(MINTER_ROLE, backendAddress);
```

3. **Grant SIGNER_ROLE** to authorized signers on ClaimReward:
```solidity
await claimReward.grantRole(SIGNER_ROLE, signerAddress);
```

4. **Grant TREASURY_ROLE** to treasury wallet on RewardVault:
```solidity
await rewardVault.grantRole(TREASURY_ROLE, treasuryAddress);
```

5. **Optional: Set minimum points to claim**:
```solidity
await claimReward.setMinPointsToClaim(minPointsRequired);
```

## Network Configuration

Add your network configuration to `hardhat.config.ts`:

```typescript
networks: {
  sepolia: {
    url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
  // Add more networks as needed
}
```

## Environment Variables

Create a `.env` file:

```env
PRIVATE_KEY=your_private_key
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
```

## Deployment Verification

After deployment, verify the contracts:

```bash
# Verify on explorer
npx hardhat verify --network sepolia <contract-address> <constructor-args>
```

## Testing the Deployment

1. Check contract addresses:
```bash
# Output will show all deployed addresses
```

2. Test role granting:
```solidity
const MINTER_ROLE = await orderNFT.MINTER_ROLE();
console.log(await orderNFT.hasRole(MINTER_ROLE, deployer.address)); // should be true
```

3. Test minting an order:
```solidity
await orderNFT.mintOrder(
  userAddress,
  productId,
  amount,
  price,
  totalPrice
);
```

