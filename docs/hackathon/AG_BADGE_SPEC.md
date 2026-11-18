# AGBadge — Airdrop Generate Agent ID Holder Badge

Spec for the Binance Agent ID Hackathon entry (vehicle: AIRDROP GENERATE).
Branch: `muse/ag-badge-hackathon` (from `development` @ 25ee43d).
Status: SPEC + CONTRACT (this turn). Deploy, frontend, distribution are later gates —
each needs Rama's explicit OK.

## 1. Hackathon facts (verified from the official Binance announcement)

- Campaign: Agent ID Hackathon by Binance Wallet + BNB Chain.
- Submission: 2026-11-18 08:00 UTC → **2026-12-09 08:00 UTC**.
- Rewards: 60,000 USDC total.
  - Data-driven Project Awards: 29,000 USDC, top 10 by on-chain metrics
    (interacting Agent ID addresses, tx volume, tx count). 1st 10,000 / 2nd 6,000 /
    3rd 4,000 / 4th 3,000 / 5th 2,000 / 6th–10th 800.
  - Innovation Award: 29,000 USDC, same prize split, judging panel, 100-point
    scoring (Agent ID depth 30%, practicality 25%, completion 25%, innovation 20%).
  - Community Promotion: 2,000 USDC, 20 X-post winners × 100 USDC.
- Each project can win only ONE of the two project awards. Winners also get one
  eligibility spot to claim a two-digit Agent ID.
- Hard requirements:
  - Contracts deployed on BNB Chain, source verified on BscScan, code open-source.
  - Project must actively use Agent ID.
  - Only submitted contract addresses count; interacting addresses must hold an
    Agent ID. Only data generated during the Submission Period counts.
  - Innovation Award eligibility: product live + **at least 30 Agent ID addresses**
    interacted with the submitted contract(s) during the period.
  - No registration needed; submit project name, website, contract address(es),
    Agent ID usage description.
- Agent ID registry (SPACE ID Agent ID, ERC-721, non-transferable):
  `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`.
  `balanceOf(address) > 0` means the address holds an Agent ID.

## 2. Why AG needs its own contract

AG's catalog contracts belong to third-party projects — they are not AG's and
cannot be submitted as AG's. Without an AG-owned contract, AG has zero countable
interactions. The badge contract is the entry's engine: every counted interaction
is a badge mint through the AG site.

## 3. Product: AGBadge

A free, soulbound ERC-721 badge. One per wallet. Mintable only by wallets that
hold an Agent ID. Claimed through the AG site. No fees, no returns promised,
no monetary value claim — a collectible proof of holding an Agent ID.

- Name: `Airdrop Generate Agent Badge`, symbol `AGBADGE`.
- Mint: free (value 0). Caller pays only gas (~100–150k gas ≈ Rp 100–200 at
  0.05 gwei).
- Gate: `AgentID.balanceOf(msg.sender) > 0` AND `hasClaimed[msg.sender] == false`.
- Soulbound: every transfer reverts (mint and burn stay allowed). Burning does
  NOT reset `hasClaimed` — no re-mint after burn.
- Token IDs: sequential from 1.
- Metadata: fully on-chain. `tokenURI` returns a `data:application/json;base64`
  document with an inline SVG image (AG gold #F0B90B on dark). No external
  dependency, no server needed to render the badge.
- Admin: NONE. No owner, no Ownable, no pause, no mint function for anyone
  except the public `mint()`, no payable functions, no ETH held. The contract
  is permissionless and immutable after deploy. Owner permissions to disclose:
  none.
- Events: `BadgeMinted(address indexed holder, uint256 indexed tokenId)`
  (plus the standard ERC-721 `Transfer` on mint).

## 4. Verified facts (read-only on-chain probe, 2026-11-19, public BSC RPC)

- Registry `name()` = `SPACE ID Agent ID`, `symbol()` = `AI`.
- `balanceOf(0x26Ba226b87320e8F44a93F8bc4277a28F6F1E850)` (Rama) = **1**.
- `tokenOfOwnerByIndex` REVERTS — the registry is NOT enumerable. The badge
  contract therefore never calls it; the gate uses `balanceOf` only.

## 5. Security notes (for the ChatGPT audit)

- No ETH flows: `mint()` is non-payable, no `receive`/`fallback`. Nothing to
  withdraw, nothing to drain.
- One external call: the registry `balanceOf` view call. No state change depends
  on untrusted return data beyond the `> 0` check.
- No reentrancy surface: no value transfer, no callback except `_safeMint`'s
  ERC721Receiver check (standard OZ behaviour; minting to a contract that
  rejects it simply reverts).
- No approvals needed by users (soulbound: `approve`/`setApprovalForAll` are
  harmless — transfers revert regardless).
- No oracle, no randomness, no upgradeability, no pausing.
- Registry address is an immutable constant. If Binance ever migrated the
  registry, this contract would need redeployment — accepted, documented.
- OpenZeppelin v5 (`ERC721`, `Base64`, `Strings`) — no custom token logic
  beyond the soulbound `_update` override and the mint gate.

## 6. Red-line compliance (hackathon rules)

- No web-based QR login: the claim flow uses an injected browser wallet
  (Binance Wallet / any injected provider) only. No QR pairing, no pairing
  codes, no session stored on a server.
- No bypass of user confirmation: the mint is a normal transaction the user
  signs in their own wallet after seeing it.
- No unauthorized transfers: the contract moves nothing except minting the badge
  to the caller.
- Open-source: contract source lives in this public repo (`contracts/`) and will
  be verified on BscScan at deploy.
- No brand impersonation: name/symbol use "Airdrop Generate" / "AG" only —
  never "Binance" / "BNB".
- No credential collection: the site never asks for seed phrases, private keys,
  API secrets, or pairing codes.
- No promised returns: nowhere do we promise income, value, or rewards for
  holding the badge. Copy must say "free collectible proof, no monetary value".
- Agent ID is NOT packaged as a wallet-lookup tool: the site never resolves an
  arbitrary name.ai to an address for browsing. It only checks the CONNECTED
  wallet's own Agent ID balance to gate its own mint.
- No volume manipulation: no wash interactions, no fake accounts. Distribution
  is organic (Rama's Telegram channel + X).

## 7. Frontend integration (LATER gate, not this turn)

- A "Claim Badge" section on the AG site: connect injected wallet → check
  Agent ID balance → mint button → tx → show badge.
- Uses `window.ethereum` only. No WalletConnect QR, no backend wallet session.
- Must NOT promise returns; must show the exact contract address and a BscScan
  link before the user signs.

## 8. Timeline to 2026-12-09 08:00 UTC

- Week 1 (19–25 Nov): spec + contract + ChatGPT audit + fixes. [THIS TURN: spec + contract]
- Week 2 (26 Nov–2 Dec): Hardhat tests → testnet deploy + test → mainnet deploy
  (needs Rama's OK) → BscScan verification → frontend claim section.
- Week 3 (3–9 Dec): distribution (Rama's Telegram channel + X) → drive 30+
  holder mints → submit materials (name, website, contract address, Agent ID
  usage description).

## 9. Open items / owner decisions

1. **LICENSE file**: the AG repo currently has NO license file. The hackathon
   requires code to be open-source. Rama to decide the license (MIT proposed,
   same as token-radar). Do NOT add it without his call.
2. **Mainnet deploy**: needs Rama's explicit OK at that step (plus a small BNB
   top-up for deploy gas; the parked Rp10,000 top-up covers it many times over).
3. **Live artifact**: applying the claim section to the live AG site needs a
   separate owner decision (same class as T11).
4. **Distribution**: Rama's own Telegram channel link + subscriber count are
   still not provided — needed to plan the 30-holder drive.
5. **Functional tests**: contract compiles this turn; Hardhat mint-flow tests
   (non-holder reverts, double-mint reverts, transfer reverts, burn keeps flag)
   run before testnet deploy.
