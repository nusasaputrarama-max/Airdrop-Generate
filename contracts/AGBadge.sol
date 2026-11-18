// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title AGBadge — Airdrop Generate Agent ID holder badge
/// @notice Free, soulbound, one per wallet. Mintable only by wallets that hold
/// a Binance Agent ID (name.ai). No fees, no admin, no promises of value.
/// @dev Metadata is fully on-chain (data-URI JSON + inline SVG). The Agent ID
/// registry (SPACE ID Agent ID) is not enumerable, so the gate uses balanceOf
/// only; no tokenOfOwnerByIndex call exists anywhere in this contract.
contract AGBadge is ERC721 {
    using Strings for uint256;

    /// @notice SPACE ID Agent ID registry (ERC-721, non-transferable).
    IAgentID public constant AGENT_ID =
        IAgentID(0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F);

    /// @notice Next token id to mint. Starts at 1.
    uint256 public nextTokenId = 1;

    /// @notice True once a wallet has claimed. Burning does NOT reset this.
    mapping(address => bool) public hasClaimed;

    event BadgeMinted(address indexed holder, uint256 indexed tokenId);

    error NotAgentIDHolder();
    error AlreadyClaimed();
    error Soulbound();

    constructor() ERC721("Airdrop Generate Agent Badge", "AGBADGE") {}

    /// @notice Mint the caller's one free badge. Requires holding an Agent ID.
    function mint() external {
        if (AGENT_ID.balanceOf(msg.sender) == 0) revert NotAgentIDHolder();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();

        hasClaimed[msg.sender] = true;
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        emit BadgeMinted(msg.sender, tokenId);
    }

    /// @notice Soulbound: every transfer reverts. Mint (from == 0) and burn
    /// (to == 0) stay allowed.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
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
