// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRewardManager {
    function addPoint(address user, uint256 tradeAmount) external;
}

contract Vault is Ownable {
    mapping(address => bool) public isWhitelistedToken;

    IRewardManager public rewardManager;
    event TokenWhitelisted(address indexed token);
    event FundTransferred(address indexed token, address indexed from, uint256 amount);
    event FundWithdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(address token, address _rewardManager) Ownable(msg.sender) {
        isWhitelistedToken[token] = true;
        rewardManager = IRewardManager(_rewardManager);
    }

    modifier onlyWhitelistedToken(address token) {
        require(isWhitelistedToken[token], "Token is not whitelisted");
        _;
    }

    function whitelistToken(address token) external onlyOwner {
        isWhitelistedToken[token] = true;
        emit TokenWhitelisted(token);
    }

    function transferFunds(address token, uint256 amount) external onlyWhitelistedToken(token) {
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        rewardManager.addPoint(msg.sender, amount);
        emit FundTransferred(token, msg.sender, amount);
    }

    function withdrawFunds(address token, uint256 amount) external onlyOwner onlyWhitelistedToken(token) {
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).transfer(msg.sender, amount);
        emit FundWithdrawn(token, msg.sender, amount);
    }
}