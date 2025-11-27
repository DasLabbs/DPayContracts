// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./RewardVault.sol";
import "@prb/math/src/UD60x18.sol";

/**
 * @title RewardManager
 * @dev Contract for claiming rewards with signature verification
 * Users can claim rewards by providing a valid signature from an authorized signer
 */
contract RewardManager is AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant POINTS_MANAGER_ROLE = keccak256("POINTS_MANAGER_ROLE");

    RewardVault public vault;

    // Mapping to prevent replay attacks
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public userPoints;

    // Mapping to track claimed points per user
    mapping(address => uint256) public claimedPoints;

    uint256 public constant POINTS_SCALE = 1e18;

    uint256 public totalPoints;
    UD60x18 public immutable k = UD60x18.wrap(316227766017000);
    UD60x18 public immutable a = UD60x18.wrap(1096910013008056000);

    // Configuration: minimum points required to claim (0 means disabled)
    uint256 public minPointsToClaim;

    // Domain separator for EIP-712
    bytes32 public DOMAIN_SEPARATOR;

    // Struct for claim data
    struct ClaimData {
        address user;
        address token;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }

    event ClaimExecuted(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 nonce
    );

    event PointsAdded(address indexed user, uint256 points);

    event NonceUpdated(address indexed user, uint256 oldNonce, uint256 newNonce);
    event PointsClaimed(address indexed user, uint256 points);
    event MinPointsToClaimUpdated(uint256 oldValue, uint256 newValue);

    constructor(address _vault) {
        require(_vault != address(0), "RewardManager: invalid vault address");

        vault = RewardVault(_vault);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Initialize domain separator for EIP-712
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("RewardManager")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @dev Hash for claim signature verification
     */
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "ClaimData(address user,address token,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    /**
     * @dev Claim rewards with signature verification
     * @param claimData Claim data structure
     * @param signature Signature from authorized signer
     */
    function claimReward(ClaimData memory claimData, bytes memory signature) external {
        require(claimData.user == msg.sender, "RewardManager: invalid user");
        require(claimData.deadline >= block.timestamp, "RewardManager: signature expired");
        require(claimData.nonce == nonces[msg.sender], "RewardManager: invalid nonce");

        // Verify signature
        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                claimData.user,
                claimData.token,
                claimData.amount,
                claimData.nonce,
                claimData.deadline
            )
        );

        bytes32 signedHash = _hashTypedDataV4(structHash);
        address signer = signedHash.recover(signature);

        require(hasRole(SIGNER_ROLE, signer), "RewardManager: invalid signature");

        // Check points if validation is enabled
        if (minPointsToClaim > 0) {
            uint256 userPoint = userPoints[msg.sender];
            uint256 alreadyClaimed = claimedPoints[msg.sender];
            require(userPoint >= alreadyClaimed + minPointsToClaim, "RewardManager: insufficient points");
            claimedPoints[msg.sender] += minPointsToClaim;
            emit PointsClaimed(msg.sender, minPointsToClaim);
        }

        // Increment nonce to prevent replay
        nonces[msg.sender]++;

        // Transfer reward from vault
        vault.claimReward(claimData.token, claimData.amount, msg.sender);

        emit ClaimExecuted(claimData.user, claimData.token, claimData.amount, claimData.nonce);
    }

    /**
     * @dev Batch claim rewards (allows multiple rewards to be claimed in one transaction)
     */
    function batchClaim(
        ClaimData[] memory claimsData,
        bytes[] memory signatures
    ) external {
        require(claimsData.length == signatures.length, "RewardManager: arrays length mismatch");

        for (uint256 i = 0; i < claimsData.length; i++) {
            ClaimData memory claimData = claimsData[i];
            bytes memory signature = signatures[i];

            require(claimData.user == msg.sender, "RewardManager: invalid user");
            require(claimData.deadline >= block.timestamp, "RewardManager: signature expired");
            
            uint256 currentNonce = nonces[msg.sender];
            require(claimData.nonce == currentNonce, "RewardManager: invalid nonce");

            bytes32 structHash = keccak256(
                abi.encode(
                    CLAIM_TYPEHASH,
                    claimData.user,
                    claimData.token,
                    claimData.amount,
                    claimData.nonce,
                    claimData.deadline
                )
            );

            bytes32 signedHash = _hashTypedDataV4(structHash);
            address signer = signedHash.recover(signature);

            require(hasRole(SIGNER_ROLE, signer), "RewardManager: invalid signature");

            // Check points if validation is enabled
            if (minPointsToClaim > 0) {
                uint256 userPoint = userPoints[msg.sender];
                uint256 alreadyClaimed = claimedPoints[msg.sender];
                require(userPoint >= alreadyClaimed + minPointsToClaim, "RewardManager: insufficient points");
                claimedPoints[msg.sender] += minPointsToClaim;
                emit PointsClaimed(msg.sender, minPointsToClaim);
            }

            nonces[msg.sender]++;
            vault.claimReward(claimData.token, claimData.amount, msg.sender);

            emit ClaimExecuted(claimData.user, claimData.token, claimData.amount, currentNonce);
        }
    }

    /**
     * @dev Get user's current nonce
     * @param user Address of the user
     * @return Current nonce value
     */
    function getUserNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /**
     * @dev Hash for EIP-712 domain
     */
    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(DOMAIN_SEPARATOR, structHash);
    }

    function addPoint(address user, uint256 tradeAmount) external onlyRole(POINTS_MANAGER_ROLE) {
        require(tradeAmount > 0, "CR: TA Zero");
        UD60x18 tradeAmountUD = UD60x18.wrap(tradeAmount);
        UD60x18 toA = pow(tradeAmountUD, a);
        UD60x18 points = mul(k, toA);
        uint256 point = points.unwrap() / POINTS_SCALE;
        userPoints[user] += point;
        totalPoints += point;
        emit PointsAdded(user, point);
    }

    /**
     * @dev Set the minimum points required to claim
     * @param minPoints Minimum points required (0 to disable)
     */
    function setMinPointsToClaim(uint256 minPoints) external onlyRole(ADMIN_ROLE) {
        uint256 oldValue = minPointsToClaim;
        minPointsToClaim = minPoints;
        emit MinPointsToClaimUpdated(oldValue, minPoints);
    }

    /**
     * @dev Reset user's claimed points (admin function for testing/troubleshooting)
     * @param user Address of the user
     */
    function resetClaimedPoints(address user) external onlyRole(ADMIN_ROLE) {
        claimedPoints[user] = 0;
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

