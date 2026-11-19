// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

/// @dev Minimal ERC-5192 interface for permanently locked ERC-721 tokens.
interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);

    function locked(uint256 tokenId) external view returns (bool);
}

/// @title AGBadge — Airdrop Generate Agent ID holder badge
/// @notice Free, permanently soulbound, one per wallet. Mintable only by
/// wallets that hold a Binance Agent ID (name.ai). No fees, no admin.
/// @dev Metadata is fully on-chain. The Agent ID registry is not enumerable;
/// the gate deliberately uses balanceOf only.
contract AGBadge is ERC721, IERC5192 {
    using Strings for uint256;

    /// @notice SPACE ID Agent ID registry (ERC-721, non-transferable).
    IAgentID public constant AGENT_ID =
        IAgentID(0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F);

    /// @notice Next token id to mint. Starts at 1.
    uint256 public nextTokenId = 1;

    /// @notice True once a wallet has claimed. It is never reset.
    mapping(address => bool) public hasClaimed;

    event BadgeMinted(address indexed holder, uint256 indexed tokenId);

    error NotAgentIDHolder();
    error AlreadyClaimed();
    error Soulbound();

    constructor() ERC721("Airdrop Generate Agent Badge", "AGBADGE") {}

    /// @notice Mint the caller's one free, permanently locked badge.
    function mint() external {
        if (AGENT_ID.balanceOf(msg.sender) == 0) revert NotAgentIDHolder();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();

        // Set before _safeMint so an ERC721Receiver callback cannot re-enter
        // mint() for this wallet.
        hasClaimed[msg.sender] = true;
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        emit BadgeMinted(msg.sender, tokenId);
    }

    /// @inheritdoc IERC5192
    /// @dev Every existing token is permanently locked. Queries for
    /// nonexistent token IDs revert as required by ERC-5192.
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// @dev ERC-5192 interface ID is 0xb45a3c0e (locked(uint256)).
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
        returns (bool)
    {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

    /// @dev Permanent soulbound policy: once minted, a token can never move
    /// or be burned. This also blocks transfers attempted through approvals.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert Soulbound();

        address previousOwner = super._update(to, tokenId, auth);
        if (to != address(0)) emit Locked(tokenId);
        return previousOwner;
    }

    /// @notice Fully on-chain metadata: base64 JSON with an inline SVG image.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory svg = string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'>",
                "<rect width='512' height='512' fill='#0b0e11'/>",
                "<circle cx='256' cy='256' r='180' fill='none' stroke='#F0B90B' stroke-width='10'/>",
                "<text x='256' y='240' font-family='sans-serif' font-size='96' font-weight='bold' fill='#F0B90B' text-anchor='middle'>AG</text>",
                "<text x='256' y='310' font-family='sans-serif' font-size='28' fill='#ffffff' text-anchor='middle'>AGENT ID HOLDER</text>",
                "<text x='256' y='350' font-family='sans-serif' font-size='22' fill='#8a8f98' text-anchor='middle'>#",
                tokenId.toString(),
                "</text></svg>"
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"Airdrop Generate Agent Badge #',
                        tokenId.toString(),
                        '",',
                        '"description":"Free soulbound proof that this wallet holds a Binance Agent ID (name.ai). Collectible only; no monetary value and no returns promised.",',
                        '"attributes":[{"trait_type":"Project","value":"Airdrop Generate"},{"trait_type":"Gate","value":"Agent ID holder"}],',
                        '"image":"data:image/svg+xml;base64,',
                        Base64.encode(bytes(svg)),
                        '"}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}
