<p align="center">
  <img src="./1600x900-spraay.png" width="700" />
</p>

# Spraay — Multi-Chain Batch Crypto Payments

Send ETH or ERC-20 tokens to **200+ recipients** in a single transaction. Live on **Base**, **Unichain**, **Plasma**, and **Bittensor**.

🌐 **[spraay.app](https://spraay.app)** · 📄 **[BaseScan](https://basescan.org/address/0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC)** · 🦄 **[Uniscan](https://uniscan.xyz/address/0x08fA5D1c16CD6E2a16FC0E4839f262429959E073)**

---

## What is Spraay?

Spraay is a multi-chain batch payment protocol that lets you send crypto to multiple recipients in one transaction. ~80% gas savings vs sending individually.

**Protocol Fee:** 0.3%
**Max Recipients:** 200 per transaction

## Deployments

| Chain | Contract | Explorer |
|-------|----------|----------|
| **Base** | `0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC` | [BaseScan](https://basescan.org/address/0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC) |
| **Unichain** | `0x08fA5D1c16CD6E2a16FC0E4839f262429959E073` | [Uniscan](https://uniscan.xyz/address/0x08fA5D1c16CD6E2a16FC0E4839f262429959E073) |
| **Plasma** | See [Spraay Plasma](https://spraay.app/plasma) | [Explorer](https://spraay.app/plasma) |
| **Bittensor** | Python CLI/API | [Spraay TAO](https://spraay.app/tao) |

## Features

- ⚡ **Batch ETH sends** — equal or variable amounts
- 🪙 **Batch ERC-20 sends** — USDC, DAI, or any token
- 📋 **CSV import** — bulk upload addresses and amounts
- 🤖 **AI Agent ready** — integrated with Coinbase AgentKit
- 🔐 **Secure** — OpenZeppelin ReentrancyGuard, Pausable, verified on-chain
- 🌐 **Multi-chain** — same interface across Base, Unichain, and Plasma

## Integrations

| Platform | Status | Link |
|----------|--------|------|
| **Coinbase AgentKit** | PR Submitted | [PR #944](https://github.com/coinbase/agentkit/pull/944) |
| **Bankr (OpenClaw)** | Pending | [OpenClaw Skills](https://github.com/BankrBot/openclaw-skills) |

### Using Spraay with AgentKit

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { spraayActionProvider } from "./action-providers/spraay";

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [spraayActionProvider()],
});

// Agent can now respond to:
// "Send 0.01 ETH to these 5 addresses..."
// "Spray 100 USDC each to 0xAAA and 0xBBB"
```

## Smart Contract

| Function | Description |
|----------|-------------|
| `sprayETH(recipients[], amounts[])` | Batch send ETH (payable) |
| `sprayToken(token, recipients[], amounts[])` | Batch send ERC-20 tokens |

Both functions accept variable amounts per recipient. Protocol fee (0.3%) is applied automatically. Same contract interface on all EVM chains.

## Use Cases

- **Payroll** — pay your team in one tx
- **Airdrops** — distribute tokens to your community
- **Bounties** — variable rewards to contributors
- **DAO distributions** — treasury payouts

## Links

- 🌐 Website: [spraay.app](https://spraay.app)
- 🦄 Unichain: [spraay.app/unichain](https://spraay.app/unichain)
- 🟢 Plasma: [spraay.app/plasma](https://spraay.app/plasma)
- 🧠 Bittensor: [spraay.app/tao](https://spraay.app/tao)
- 🐦 Twitter: [@lostpoet](https://twitter.com/lostpoet)
- 💜 Farcaster: [@plag](https://warpcast.com/plag)
- 💻 GitHub: [plagtech](https://github.com/plagtech)
