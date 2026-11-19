// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AGBadge} from "../AGBadge.sol";

interface Vm {
    function etch(address target, bytes calldata code) external;
    function store(address target, bytes32 slot, bytes32 value) external;
    function prank(address sender) external;
    function expectRevert(bytes4 revertData) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter) external;
}

contract MockAgentIDRegistry {
    mapping(address => uint256) public balances;

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}

contract ReentrantBadgeReceiver {
    AGBadge private immutable badge;
    bool public reentryBlocked;

    constructor(AGBadge badge_) {
        badge = badge_;
    }

    function claim() external {
        badge.mint();
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        returns (bytes4)
    {
        (bool success, bytes memory result) =
            address(badge).call(abi.encodeWithSelector(AGBadge.mint.selector));
        reentryBlocked =
            !success && _selector(result) == AGBadge.AlreadyClaimed.selector;
        return 0x150b7a02;
    }

    function _selector(bytes memory data) private pure returns (bytes4 selector) {
        if (data.length >= 4) {
            assembly {
                selector := mload(add(data, 32))
            }
        }
    }
}

contract AGBadgeTest {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant REGISTRY =
        0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    address private constant ALICE = address(0xA11CE);
    address private constant BOB = address(0xB0B);

    AGBadge private badge;

    event Locked(uint256 tokenId);

    function setUp() public {
        MockAgentIDRegistry implementation = new MockAgentIDRegistry();
        vm.etch(REGISTRY, address(implementation).code);
        _setAgentIDHolder(ALICE, true);
        badge = new AGBadge();
    }

    function testNonHolderCannotMint() public {
        vm.expectRevert(AGBadge.NotAgentIDHolder.selector);
        vm.prank(BOB);
        badge.mint();
    }

    function testHolderCanMintExactlyOnce() public {
        vm.expectEmit(false, false, false, true, address(badge));
        emit Locked(1);

        vm.prank(ALICE);
        badge.mint();

        require(badge.ownerOf(1) == ALICE, "wrong owner");
        require(badge.hasClaimed(ALICE), "claim flag not set");
        require(badge.nextTokenId() == 2, "token id not incremented");

        vm.expectRevert(AGBadge.AlreadyClaimed.selector);
        vm.prank(ALICE);
        badge.mint();
    }

    function testTransfersRevert() public {
        vm.prank(ALICE);
        badge.mint();

        vm.expectRevert(AGBadge.Soulbound.selector);
        vm.prank(ALICE);
        badge.transferFrom(ALICE, BOB, 1);

        vm.expectRevert(AGBadge.Soulbound.selector);
        vm.prank(ALICE);
        badge.safeTransferFrom(ALICE, BOB, 1);
    }

    function testApprovalCannotEnableTransfer() public {
        vm.prank(ALICE);
        badge.mint();
        badge.approve(BOB, 1);

        vm.expectRevert(AGBadge.Soulbound.selector);
        vm.prank(BOB);
        badge.transferFrom(ALICE, BOB, 1);

        require(badge.ownerOf(1) == ALICE, "approved transfer moved token");
    }

    function testERC5192InterfaceAndLockedState() public {
        vm.prank(ALICE);
        badge.mint();

        require(badge.supportsInterface(0xb45a3c0e), "ERC-5192 not advertised");
        require(badge.locked(1), "minted token is not locked");
        require(badge.supportsInterface(0x80ac58cd), "ERC-721 missing");
        require(badge.supportsInterface(0x01ffc9a7), "ERC-165 missing");

        vm.expectRevert(bytes4(keccak256("ERC721NonexistentToken(uint256)")));
        badge.locked(999);
    }

    function testMetadataIsOnChainDataURI() public {
        vm.prank(ALICE);
        badge.mint();

        bytes memory uri = bytes(badge.tokenURI(1));
        require(uri.length > 100, "metadata unexpectedly short");
        require(bytes5(uri) == bytes5("data:"), "metadata is not a data URI");
    }

    function testBadgeCannotBeBurnedOrReclaimed() public {
        vm.prank(ALICE);
        badge.mint();

        (bool burnSucceeded,) =
            address(badge).call(abi.encodeWithSignature("burn(uint256)", 1));
        require(!burnSucceeded, "unexpected public burn function");

        (bool transferToZero,) = address(badge).call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)", ALICE, address(0), 1
            )
        );
        require(!transferToZero, "token burned through transferFrom");

        require(badge.ownerOf(1) == ALICE, "badge was destroyed");
        require(badge.hasClaimed(ALICE), "claim flag was reset");
    }

    function testReentrantMintIsBlocked() public {
        ReentrantBadgeReceiver receiver = new ReentrantBadgeReceiver(badge);
        _setAgentIDHolder(address(receiver), true);

        receiver.claim();

        require(receiver.reentryBlocked(), "reentrant mint was not blocked");
        require(badge.ownerOf(1) == address(receiver), "receiver did not get badge");
        require(badge.nextTokenId() == 2, "reentry minted an extra token");
    }

    function _setAgentIDHolder(address account, bool isHolder) private {
        bytes32 slot = keccak256(abi.encode(account, uint256(0)));
        vm.store(REGISTRY, slot, isHolder ? bytes32(uint256(1)) : bytes32(0));
    }
}
