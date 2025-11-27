// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RewardVault
 * @dev Upgradeable vault contract for storing reward tokens with access control
 */
contract RewardVault is UUPSUpgradeable, AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant CLAIMER_ROLE = keccak256("CLAIMER_ROLE");

    // Mapping from reward token address to available balance
    mapping(address => uint256) public tokenBalances;

    event TokensDeposited(address indexed token, uint256 amount, address indexed depositor);
    event TokensWithdrawn(address indexed token, uint256 amount, address indexed to);
    event RewardClaimed(address indexed token, uint256 amount, address indexed to);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
    }

    /**
     * @dev Deposit reward tokens into the vault
     * @param token Address of the ERC20 token to deposit
     * @param amount Amount of tokens to deposit
     */
    function depositTokens(address token, uint256 amount) external onlyRole(TREASURY_ROLE) {
        require(token != address(0), "RewardVault: invalid token address");
        require(amount > 0, "RewardVault: amount must be greater than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        tokenBalances[token] += amount;

        emit TokensDeposited(token, amount, msg.sender);
    }

    /**
     * @dev Withdraw tokens from the vault (only admin)
     * @param token Address of the ERC20 token to withdraw
     * @param amount Amount of tokens to withdraw
     * @param to Address to send the tokens to
     */
    function withdrawTokens(address token, uint256 amount, address to) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "RewardVault: invalid token address");
        require(to != address(0), "RewardVault: invalid recipient address");
        require(tokenBalances[token] >= amount, "RewardVault: insufficient balance");

        tokenBalances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);

        emit TokensWithdrawn(token, amount, to);
    }

    /**
     * @dev Claim reward for a user (called by claim contract)
     * @param token Address of the reward token
     * @param amount Amount to claim
     * @param to Address to send tokens to
     */
    function claimReward(address token, uint256 amount, address to) external onlyRole(CLAIMER_ROLE) {
        require(token != address(0), "RewardVault: invalid token address");
        require(to != address(0), "RewardVault: invalid recipient address");
        require(tokenBalances[token] >= amount, "RewardVault: insufficient balance");

        tokenBalances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);

        emit RewardClaimed(token, amount, to);
    }

    /**
     * @dev Get the available balance of a token in the vault
     * @param token Address of the ERC20 token
     * @return Balance of the token in the vault
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }

    /**
     * @dev Grant a role to an account (can be called by admin to set up roles)
     * @param role Role to grant
     * @param account Address to grant the role to
     */
    function grantRole(bytes32 role, address account) public override onlyRole(ADMIN_ROLE) {
        _grantRole(role, account);
    }

    /**
     * @dev Revoke a role from an account
     * @param role Role to revoke
     * @param account Address to revoke the role from
     */
    function revokeRole(bytes32 role, address account) public override onlyRole(ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    /**
     * @dev Authorize upgrade (required for UUPS)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    /**
     * @dev Returns true if the contract implements the interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

