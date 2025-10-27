# DPay Contract Deployment Guide

This document provides comprehensive instructions for deploying the DPay contract suite.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Contract Architecture](#contract-architecture)
- [Deployment Methods](#deployment-methods)
- [Post-Deployment Setup](#post-deployment-setup)
- [Testing](#testing)
- [Production Checklist](#production-checklist)

## Overview

The DPay system consists of three main contracts:

1. **OrderNFT** - ERC721 NFT contract storing order information and reward points
2. **RewardVault** - Upgradeable vault (UUPS pattern) for storing reward tokens
3. **ClaimReward** - Signature-based reward claiming with optional points validation

## Prerequisites

### Required Dependencies

```bash
npm install
```

This will install:
- Hardhat and development tools
- OpenZeppelin contracts and upgrades
- TypeScript and type definitions

### Environment Setup

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Contract Architecture

### Deployment Flow

```
1. OrderNFT (Non-upgradeable)
   └─ Stores order data and calculates points
   
2. RewardVault (UUPS Upgradeable)
   ├─ Proxy: User-facing address
   ├─ Implementation: RewardVault
   └─ Future: RewardVaultV1 (for upgrades)
   
3. ClaimReward (Non-upgradeable)
   └─ Manages signature-based claims
```

### Role Hierarchy

**OrderNFT:**
- `DEFAULT_ADMIN_ROLE` - Full control
- `ADMIN_ROLE` - Administrative functions
- `MINTER_ROLE` - Mint new order NFTs

**RewardVault:**
- `DEFAULT_ADMIN_ROLE` - Full control
- `ADMIN_ROLE` - Administrative functions, upgrades
- `TREASURY_ROLE` - Deposit tokens
- `CLAIMER_ROLE` - Claim rewards (granted to ClaimReward)

**ClaimReward:**
- `DEFAULT_ADMIN_ROLE` - Full control
- `ADMIN_ROLE` - Administrative functions
- `SIGNER_ROLE` - Sign claim messages

## Deployment Methods

### Method 1: Complete Deployment (Recommended)

This method deploys all contracts and sets up all roles automatically.

```bash
npx hardhat run scripts/deploy.ts
```

**Output:**
- OrderNFT address
- RewardVault proxy address
- ClaimReward address
- All necessary role grants

### Method 2: Step-by-Step Deployment

For more control over the deployment process:

```bash
npx hardhat run scripts/deploy-separate.ts
```

### Method 3: Hardhat Ignition (Beta)

Using Hardhat's new ignition system:

```bash
npx hardhat ignition deploy ignition/modules/deploy.ts
```

### Network Deployment

```bash
# Testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Mainnet (be careful!)
npx hardhat run scripts/deploy.ts --network mainnet
```

### Network Configuration

Add networks to `hardhat.config.ts`:

```typescript
networks: {
  sepolia: {
    url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
  polygon: {
    url: `https://polygon-rpc.com`,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
}
```

## Post-Deployment Setup

After deployment, verify and configure the contracts:

### 1. Verify Contracts (Optional)

```bash
npx hardhat verify --network sepolia <ORDER_NFT_ADDRESS> "DPay Order NFT" "DPAY-ORDER" <ADMIN_ADDRESS>
npx hardhat verify --network sepolia <REWARD_VAULT_ADDRESS>
npx hardhat verify --network sepolia <CLAIM_REWARD_ADDRESS> <VAULT_ADDRESS> <NFT_ADDRESS> <ADMIN_ADDRESS>
```

### 2. Verify Setup

```bash
npx hardhat run scripts/verify.ts --network <network>
```

Set environment variables:
```bash
export ORDER_NFT_ADDRESS=0x...
export REWARD_VAULT_ADDRESS=0x...
export CLAIM_REWARD_ADDRESS=0x...
```

### 3. Configure Roles

**Grant MINTER_ROLE to backend service:**
```solidity
await orderNFT.grantRole(MINTER_ROLE, backendAddress);
```

**Grant TREASURY_ROLE to treasury wallet:**
```solidity
await rewardVault.grantRole(TREASURY_ROLE, treasuryAddress);
```

**Grant SIGNER_ROLE to signers:**
```solidity
await claimReward.grantRole(SIGNER_ROLE, signerAddress);
```

### 4. Optional: Enable Points Validation

```solidity
await claimReward.setMinPointsToClaim(minPointsRequired);
// Set to 0 to disable
```

## Testing

### Local Testing

1. Start local node:
```bash
npx hardhat node
```

2. Deploy contracts:
```bash
npx hardhat run scripts/deploy.ts
```

3. Run tests:
```bash
npx hardhat test
```

### Interact with Contracts

```bash
npx hardhat run scripts/interact.ts
```

### Manual Testing

1. **Mint an Order NFT:**
```typescript
const tx = await orderNFT.mintOrder(
  userAddress,
  productId,
  amount,
  price,
  totalPrice
);
```

2. **Deposit Tokens:**
```typescript
await token.approve(rewardVault.address, amount);
await rewardVault.depositTokens(tokenAddress, amount);
```

3. **Claim Reward:**
```typescript
// First, get user's nonce
const nonce = await claimReward.getUserNonce(userAddress);

// Create claim data
const claimData = {
  user: userAddress,
  token: rewardTokenAddress,
  amount: parseEther("100"),
  nonce: nonce,
  deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
};

// Sign the claim data (off-chain)
const signature = await signClaimData(claimData, signerPrivateKey);

// Claim
await claimReward.claimReward(claimData, signature);
```

## Production Checklist

Before deploying to production:

### Security

- [ ] Audit contracts (consider professional audit)
- [ ] Test all functions thoroughly
- [ ] Verify constructor parameters
- [ ] Check access control (roles)
- [ ] Review upgrade authorization
- [ ] Validate signature verification logic

### Configuration

- [ ] Set appropriate admin addresses
- [ ] Configure signer addresses
- [ ] Set minimum points threshold (if using)
- [ ] Configure token addresses
- [ ] Set up monitoring/alerts

### Deployment

- [ ] Deploy to testnet first
- [ ] Verify contract source code on explorer
- [ ] Test all major functions
- [ ] Check gas costs
- [ ] Document all addresses
- [ ] Deploy to mainnet
- [ ] Monitor initial transactions

### Post-Deployment

- [ ] Grant roles to appropriate addresses
- [ ] Deposit initial tokens
- [ ] Test minting orders
- [ ] Test claiming rewards
- [ ] Monitor for issues
- [ ] Keep private keys secure

### Upgrade Preparation (UUPS)

For future upgrades:

1. Deploy new implementation (RewardVaultV1)
2. Authorize upgrade:
```solidity
await rewardVault.authorizeUpgrade(newImplementation);
```
3. Upgrade:
```solidity
await upgrades.upgradeProxy(rewardVaultAddress, RewardVaultV1);
```

## Troubleshooting

### Issue: Role not granted

**Solution:** Grant the appropriate role:
```solidity
await contract.grantRole(ROLE, address);
```

### Issue: Insufficient points

**Solution:** 
- Check user's total points: `calculateTotalPoints(user)`
- Check claimed points: `claimedPoints(user)`
- Adjust minPointsToClaim if needed

### Issue: Signature verification fails

**Solution:**
- Verify correct domain separator
- Check signature matches claim data
- Ensure signer has SIGNER_ROLE
- Validate deadline hasn't expired
- Check nonce matches

### Issue: UUPS upgrade fails

**Solution:**
- Ensure caller has ADMIN_ROLE
- Verify implementation is compatible
- Check storage layout compatibility

## Support

For issues or questions:
- Review contract comments in source code
- Check OpenZeppelin documentation
- Review Hardhat documentation

## License

MIT

