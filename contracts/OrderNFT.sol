// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title OrderNFT
 * @dev ERC721 NFT contract that stores user order information
 * Each NFT represents a purchase order with product details
 */
contract OrderNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    using Strings for uint256;

    // Struct to store order information
    struct OrderInfo {
        uint256 productId;
        uint256 amount;
        uint256 price;
        uint256 totalPrice;
        uint256 points;
        uint256 timestamp;
    }

    // Mapping from token ID to order information
    mapping(uint256 => OrderInfo) public orders;
    
    // Total supply of NFTs
    uint256 private _tokenIdCounter;
    
    // Base URI for token metadata
    string private _baseTokenURI;

    event OrderMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 productId,
        uint256 amount,
        uint256 price,
        uint256 totalPrice,
        uint256 points
    );

    constructor(string memory name, string memory symbol, address admin) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _tokenIdCounter = 1;
    }

    /**
     * @dev Mint a new order NFT
     * @param to Address to mint the NFT to
     * @param productId Product identifier
     * @param amount Amount of products purchased
     * @param price Price per product
     * @param totalPrice Total price of the order
     * @return tokenId The ID of the newly minted NFT
     */
    function mintOrder(
        address to,
        uint256 productId,
        uint256 amount,
        uint256 price,
        uint256 totalPrice
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "OrderNFT: cannot mint to zero address");
        require(amount > 0, "OrderNFT: amount must be greater than 0");
        require(price > 0, "OrderNFT: price must be greater than 0");
        require(totalPrice > 0, "OrderNFT: total price must be greater than 0");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // Calculate points using non-linear algorithm
        uint256 points = calculatePoints(totalPrice);

        // Store order information
        orders[tokenId] = OrderInfo({
            productId: productId,
            amount: amount,
            price: price,
            totalPrice: totalPrice,
            points: points,
            timestamp: block.timestamp
        });

        // Mint the NFT
        _safeMint(to, tokenId);

        emit OrderMinted(tokenId, to, productId, amount, price, totalPrice, points);

        return tokenId;
    }

    /**
     * @dev Calculate reward points using non-linear algorithm
     * Formula: points = sqrt(totalPrice / 100) * 10
     * This creates diminishing returns - more spending requires more money to earn the same amount of points
     * @param totalPrice Total price of the order
     * @return Points calculated for the order
     */
    function calculatePoints(uint256 totalPrice) public pure returns (uint256) {
        if (totalPrice == 0) {
            return 0;
        }
        
        // Non-linear formula: sqrt(price/100) * 10
        // This means: $100 = 10 points, $400 = 20 points, $900 = 30 points
        uint256 sqrtValue = sqrt(totalPrice * 100); // Multiply by 100 to increase precision
        return sqrtValue / 10; // Divide by 10 to scale down
    }

    /**
     * @dev Calculate square root using Babylonian method
     * @param x Input value
     * @return Square root
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        if (x == 1) return 1;

        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @dev Get order information for a token ID
     * @param tokenId NFT token ID
     * @return Order information struct
     */
    function getOrderInfo(uint256 tokenId) external view returns (OrderInfo memory) {
        require(_ownerOf(tokenId) != address(0), "OrderNFT: token does not exist");
        return orders[tokenId];
    }

    /**
     * @dev Get total number of NFTs minted
     * @return Total supply
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    /**
     * @dev Set base URI for token metadata
     * @param baseURI Base URI string
     */
    function setBaseURI(string memory baseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Burn an order NFT
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(_isAuthorized(_ownerOf(tokenId), msg.sender, tokenId), "OrderNFT: caller is not owner nor approved");
        _burn(tokenId);
    }

    // Override required functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

