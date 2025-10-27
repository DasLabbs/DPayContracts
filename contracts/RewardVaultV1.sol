// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./RewardVault.sol";

/**
 * @title RewardVaultV1
 * @dev This is the implementation contract (storage pattern for upgradeable contracts)
 * This contract is deployed and the vault uses UUPS proxy pattern
 */
contract RewardVaultV1 is RewardVault {
    // Reserved storage slots for future upgrades
    uint256[50] private __gap;
}

