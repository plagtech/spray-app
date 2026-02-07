# Spraay - Batch Crypto Payments on Base

Send ETH or ERC-20 tokens to 200+ recipients in a single transaction. Integrated with [Bankr's](https://bankr.bot) AI agent for natural language batch payments.

🌐 **Website:** [spraay.app](https://spraay.app)  
📜 **Contract:** [`0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC`](https://basescan.org/address/0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC) (Base Mainnet)

## ✨ Features

- **Batch ETH & ERC-20 Sends** - Variable or equal amounts to multiple recipients
- **CSV Import** - Handle large distributions efficiently
- **Social Handle Resolution** - Send to Farcaster handles and ENS names
- **Swap + Spray** - Combine with Bankr's trading skill for seamless flows
- **~80% Gas Savings** - Compared to individual transfers
- **Natural Language Interface** - Use via Bankr on Telegram, Discord, or Farcaster

## 🚀 Use Cases

- 🎁 **Airdrops** - Distribute tokens to community members
- 💰 **Payroll** - Pay team members in crypto
- 🎯 **Rewards** - Send rewards to participants or winners
- 🤝 **Distributions** - Execute treasury or profit sharing

## 🔧 Technical Details

- **Network:** Base (Chain ID: 8453)
- **Protocol Fee:** 0.3%
- **Max Recipients:** 200 per transaction
- **Solidity Version:** 0.8.20
- **Security:** OpenZeppelin v5, Audited patterns

## 🤖 Integration

Spraay is integrated with [Bankr](https://bankr.bot)'s AI agent platform (69K+ users across social platforms). Users can execute batch payments through natural language on:
- Telegram
- Discord  
- Farcaster

## 📝 Smart Contract

```solidity
// Spraay Contract: 0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC

function sprayETH(Recipient[] calldata recipients) external payable
function sprayToken(address token, Recipient[] calldata recipients) external
function sprayEqual(address token, address payable[] calldata recipients, uint256 amountPerRecipient) external payable
```

[View Verified Contract on BaseScan →](https://basescan.org/address/0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC#code)

## 🔗 Links

- Website: [spraay.app](https://spraay.app)
- Twitter: [@lostpoet](https://twitter.com/lostpoet)
- Farcaster: [@plag](https://warpcast.com/plag)
- BaseScan: [Contract](https://basescan.org/address/0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC)

## 📊 Stats

- ⚡ ~80% gas savings vs individual transfers
- 📈 Supports 200+ recipients per transaction
- 💎 0.3% protocol fee
- 🔒 Built with OpenZeppelin security standards

---

Built by [@lostpoet](https://twitter.com/lostpoet) | Part of the Base ecosystem
