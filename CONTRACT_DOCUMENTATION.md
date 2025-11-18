# DPay Contract System Documentation

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Contract Flow](#contract-flow)
- [Individual Contracts](#individual-contracts)
  - [OrderNFT](#ordernft)
  - [RewardVault](#rewardvault)
  - [ClaimReward](#claimreward)
- [Points Calculation System](#points-calculation-system)
- [Security Features](#security-features)
- [Access Control & Roles](#access-control--roles)
- [Integration Guide](#integration-guide)

---

## Overview

DPay is a reward system that allows users to earn points through purchases and redeem those points for token rewards. The system consists of three main smart contracts:

1. **OrderNFT**: Stores purchase orders as NFTs with embedded points
2. **RewardVault**: Holds reward tokens that users can claim
3. **ClaimReward**: Manages signature-based reward claiming with points validation

The system uses a **non-linear points algorithm** that creates diminishing returns, encouraging more frequent smaller purchases rather than large one-time purchases.

---

## System Architecture

```
┌─────────────────┐
│   User Action   │
│  (Purchase)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│  (Off-chain)    │
└────────┬────────┘
         │
         ├── 1. Calculate Points
         │
         ▼
┌─────────────────┐
│   OrderNFT      │
│  (ERC721)       │◄──┐
│                 │   │ Tracks User Points
│ • Mint NFT      │   │
│ • Store Order   │   │
│ • Calculate     │   │
│   Points        │   │
└────────┬────────┘   │
         │            │
         │            │
         ▼            │
┌─────────────────┐   │
│  RewardVault    │   │
│  (UUPS Proxy)   │   │
│                 │   │
│ • Hold Tokens   │   │
│ • Track Balance │   │
└────────┬────────┘   │
         │            │
         │            │
         ▼            │
┌─────────────────┐   │
│   ClaimReward   │   │
│                 │───┘
│ • Verify Sig     │
│ • Check Points   │
│ • Transfer Tokens│
└─────────────────┘
```

---

## Contract Flow

### 1. Purchase Flow

```
User makes purchase
    ↓
Backend receives payment
    ↓
Backend calculates points
    ↓
Backend calls OrderNFT.mintOrder()
    ↓
OrderNFT creates NFT with order data
    ↓
Points are stored in NFT
```

### 2. Rewards Deposit Flow

```
Treasury receives tokens
    ↓
Treasury approves RewardVault
    ↓
Treasury calls RewardVault.depositTokens()
    ↓
Tokens stored in vault
```

### 3. Claim Flow

```
User wants to claim reward
    ↓
Backend creates signature for claim
    ↓
User calls ClaimReward.claimReward()
    ↓
ClaimReward verifies signature
    ↓
ClaimReward checks user's points
    ↓
ClaimReward calls RewardVault.claimReward()
    ↓
Tokens transferred to user
```

---

## Individual Contracts

### OrderNFT

**Purpose**: Store purchase orders as ERC721 NFTs with embedded point values.

**Key Features**:
- Each NFT represents a purchase order
- Automatically calculates points using non-linear algorithm
- Stores order metadata (product ID, amount, price, timestamp)

**Order Information Structure**:
```solidity
struct OrderInfo {
    uint256 productId;    // Product identifier
    uint256 amount;        // Quantity purchased
    uint256 price;         // Price per unit
    uint256 totalPrice;    // Total order value
    uint256 points;        // Reward points earned
    uint256 timestamp;     // Order timestamp
}
```

**Key Functions**:

- `mintOrder()`: Creates a new order NFT
  - Requires: MINTER_ROLE
  - Calculates points automatically
  - Emits OrderMinted event

- `calculatePoints()`: Computes points using formula
  - Formula: `sqrt(totalPrice / 100) * 10`
  - Creates diminishing returns

- `getOrderInfo()`: Retrieves order data for a token
  - Returns full OrderInfo struct

**Example**:
```solidity
// Mint an order for $400 worth of products
await orderNFT.mintOrder(
    userAddress,    // to
    123,            // productId
    10,             // amount
    40,             // price per unit
    400             // totalPrice
);
// Result: NFT minted with ~20 points (sqrt(400/100) * 10)
```

---

### RewardVault

**Purpose**: Securely store reward tokens with upgradeable infrastructure (UUPS pattern).

**Key Features**:
- Upgradeable using UUPS proxy pattern
- Role-based access control
- Tracks token balances per token address
- Supports multiple reward token types

**Key Functions**:

- `depositTokens()`: Treasury deposits reward tokens
  - Requires: TREASURY_ROLE
  - Transfers tokens to vault
  - Updates balance tracking

- `claimReward()`: Transfers tokens to users
  - Requires: CLAIMER_ROLE (only ClaimReward contract)
  - Deducts from vault balance

- `withdrawTokens()`: Admin can withdraw tokens
  - Requires: ADMIN_ROLE
  - Emergency/manual withdraw

- `getTokenBalance()`: View available balance
  - Returns amount available for claiming

**Example**:
```solidity
// Treasury deposits 10,000 reward tokens
await token.approve(rewardVaultAddress, 10000);
await rewardVault.depositTokens(tokenAddress, 10000);

// User claims 100 tokens (called by ClaimReward)
await rewardVault.claimReward(tokenAddress, 100, userAddress);
```

---

### ClaimReward

**Purpose**: Verify claim signatures and manage reward distribution with optional points validation.

**Key Features**:
- Signature-based claiming (EIP-712)
- Optional points validation system
- Nonce-based replay attack prevention
- Batch claiming support

**Claim Data Structure**:
```solidity
struct ClaimData {
    address user;      // Recipient address
    address token;     // Reward token address
    uint256 amount;    // Amount to claim
    uint256 nonce;     // Anti-replay nonce
    uint256 deadline;  // Signature expiration
}
```

**Claim Process**:
1. User accumulates points through purchases (OrderNFT)
2. Backend creates signature for claim request
3. User submits transaction with claim data + signature
4. Contract verifies signature from authorized signer
5. Contract checks points if validation enabled
6. Contract transfers tokens from vault

**Key Functions**:

- `claimReward()`: Single reward claim
  - Verifies EIP-712 signature
  - Checks deadline (signature expiration)
  - Validates nonce (replay prevention)
  - Checks user has sufficient points
  - Transfers tokens from vault

- `batchClaim()`: Multiple rewards in one transaction
  - Processes multiple claims atomically
  - Same validations per claim

- `calculateTotalPoints()`: Calculate user's total points
  - Iterates through all OrderNFTs
  - Sums points from NFTs owned by user

- `getAvailablePoints()`: Points available for claiming
  - Total points - already claimed points

- `setMinPointsToClaim()`: Configure points requirement
  - Sets how many points needed per claim
  - Set to 0 to disable points validation

**Example**:
```solidity
// Backend creates signature
const claimData = {
    user: userAddress,
    token: rewardTokenAddress,
    amount: ethers.parseEther("100"),
    nonce: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
};

const signature = await signClaimData(claimData, signerPrivateKey);

// User claims
await claimReward.claimReward(claimData, signature);
// Result: 100 tokens transferred to user
```

**Points Validation**:
- If `minPointsToClaim > 0`:
  - User must have at least `minPointsToClaim` unclaimed points
  - Points are deducted from available balance
- If `minPointsToClaim = 0`:
  - Points validation is disabled
  - Anyone with valid signature can claim

---

## Points Calculation System

### Formula

```
points = sqrt(totalPrice / 100) * 10
```

### Examples

| Total Price | Calculation | Points Earned |
|-------------|-------------|---------------|
| $100        | sqrt(100/100) * 10 = 10 | 10 |
| $400        | sqrt(400/100) * 10 = 20 | 20 |
| $900        | sqrt(900/100) * 10 = 30 | 30 |
| $1,600      | sqrt(1600/100) * 10 = 40 | 40 |

### Why Non-Linear?

The square root formula creates **diminishing returns**, which:
- Encourages frequent smaller purchases
- Prevents gaming through large one-time purchases
- Rewards consistent customers more
- Creates fairer distribution of rewards

**Example**: To earn 60 points:
- Option 1: One purchase of $3,600
- Option 2: Three purchases of $400 (60 total points)

---

## Security Features

### 1. Signature Verification (EIP-712)

Claims require cryptographic signatures from authorized signers:
- Uses EIP-712 standard for structured data signing
- Prevents unauthorized claims
- Backend controls who can claim

### 2. Nonce System

Each user has an incrementing nonce:
- Prevents replay attacks
- Ensures each signature is used once
- Tracks claim order

### 3. Deadline Enforcement

Signatures expire after set time:
- Prevents replay of old claims
- Ensures data freshness
- Reduces risk of signature leakage

### 4. Access Control

Role-based access control (OpenZeppelin):
- Different roles for different functions
- Granular permission management
- Secure role assignment

### 5. Upgradeable Vault

RewardVault uses UUPS proxy pattern:
- Can upgrade implementation without losing data
- Preserves balances across upgrades
- Future-proof architecture

---

## Access Control & Roles

### OrderNFT Roles

| Role | Permissions |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Full administrative control |
| `ADMIN_ROLE` | Update metadata, configure settings |
| `MINTER_ROLE` | Mint new order NFTs |

### RewardVault Roles

| Role | Permissions |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Full administrative control |
| `ADMIN_ROLE` | Withdraw tokens, upgrade vault, manage roles |
| `TREASURY_ROLE` | Deposit reward tokens |
| `CLAIMER_ROLE` | Transfer tokens to users (granted to ClaimReward) |

### ClaimReward Roles

| Role | Permissions |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Full administrative control |
| `ADMIN_ROLE` | Configure points, reset user data |
| `SIGNER_ROLE` | Create valid signatures for claims |

---

## Integration Guide

### Backend Integration

#### 1. Mint Order NFT

```typescript
// When user completes a purchase
const orderNFT = new ethers.Contract(
    ORDER_NFT_ADDRESS,
    OrderNFT_ABI,
    wallet // Has MINTER_ROLE
);

const tx = await orderNFT.mintOrder(
    userAddress,
    productId,
    amount,
    pricePerUnit,
    totalPrice
);

await tx.wait();
// NFT minted with points calculated automatically
```

#### 2. Create Claim Signature

```typescript
// Create claim signature for user
const nonce = await claimReward.getUserNonce(userAddress);

const domain = {
    name: 'ClaimReward',
    version: '1',
    chainId: 1, // Mainnet
    verifyingContract: CLAIM_REWARD_ADDRESS
};

const types = {
    ClaimData: [
        { name: 'user', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
    ]
};

const claimData = {
    user: userAddress,
    token: rewardTokenAddress,
    amount: ethers.parseEther('100'),
    nonce: nonce,
    deadline: Math.floor(Date.now() / 1000) + 3600
};

const signature = await wallet.signTypedData(domain, types, claimData);

// Return signature to frontend
return signature;
```

#### 3. User Claims Reward

```typescript
// Frontend submits claim
const claimReward = new ethers.Contract(
    CLAIM_REWARD_ADDRESS,
    ClaimReward_ABI,
    userWallet
);

const tx = await claimReward.claimReward(claimData, signature);
await tx.wait();

// Tokens transferred to user
```

### Deposit Rewards

```typescript
// Treasury deposits tokens into vault
const token = new ethers.Contract(
    tokenAddress,
    ERC20_ABI,
    treasuryWallet
);

// Approve vault to spend
await token.approve(rewardVaultAddress, amount);
await tx1.wait();

// Deposit to vault
const rewardVault = new ethers.Contract(
    rewardVaultAddress,
    RewardVault_ABI,
    treasuryWallet // Has TREASURY_ROLE
);

await rewardVault.depositTokens(tokenAddress, amount);
```

### Query User Points

```typescript
// Get user's total points
const totalPoints = await claimReward.calculateTotalPoints(userAddress);

// Get available points (not yet claimed)
const availablePoints = await claimReward.getAvailablePoints(userAddress);

console.log(`Total points: ${totalPoints}`);
console.log(`Available points: ${availablePoints}`);
```

---

## Summary

The DPay system provides a comprehensive reward mechanism:

1. **OrderNFT**: Users earn points through purchases, stored as NFTs
2. **RewardVault**: Securely holds reward tokens with upgrade capability
3. **ClaimReward**: Manages authenticated, verified claims

The non-linear points system encourages engagement while preventing gaming. The signature-based claiming ensures only authorized users receive rewards, and the vault can be upgraded for future improvements.

**Key Benefits**:
- Secure and decentralized
- Flexible reward distribution
- Upgradeable infrastructure
- Transparent point calculation
- Gas-efficient batch operations
- Role-based access control

---

## Additional Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [EIP-712 Signature Standard](https://eips.ethereum.org/EIPS/eip-712)
- [UUPS Upgrade Pattern](https://docs.openzeppelin.com/upgrades-plugins/1.x/uups)
- [Hardhat Documentation](https://hardhat.org/docs)

---

**Last Updated**: 2024

