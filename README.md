# Spraay — Batch Crypto Payments on Base

Send ETH or ERC-20 tokens to **200+ recipients** in a single transaction.

🌐 **[spraay.app](https://spraay.app)** · 📄 **[Contract on BaseScan](https://basescan.org/address/0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC)**

---

## What is Spraay?

Spraay is a batch payment protocol on **Base** that lets you send crypto to multiple recipients in one transaction. ~80% gas savings vs sending individually.

**Contract:** `0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC`
**Protocol Fee:** 0.3%
**Max Recipients:** 200 per transaction

## Features

- ⚡ **Batch ETH sends** — equal or variable amounts
- 🪙 **Batch ERC-20 sends** — USDC, DAI, or any token
- 📋 **CSV import** — bulk upload addresses and amounts
- 💬 **Natural language** — "Spray 10 USDC to @alice @bob @charlie" via Bankr
- 🤖 **AI Agent ready** — integrated with Coinbase AgentKit
- 🔐 **Secure** — OpenZeppelin ReentrancyGuard, Pausable, verified on BaseScan

## Integrations

| Platform | Status | Link |
|----------|--------|------|
| **Coinbase AgentKit** | PR Submitted | [PR #944](https://github.com/coinbase/agentkit/pull/944) |
| **Bankr (OpenClaw)** | PR Submitted | [OpenClaw Skills](https://github.com/BankrBot/openclaw-skills) |

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

### Using Spraay with Bankr

Via Bankr's natural language interface on X, Farcaster, or Telegram:

```
Spray 0.1 ETH each to 0xAAA, 0xBBB, 0xCCC
```

## Smart Contract

| Function | Description |
|----------|-------------|
| `sprayETH(recipients[], amounts[])` | Batch send ETH (payable) |
| `sprayToken(token, recipients[], amounts[])` | Batch send ERC-20 tokens |

Both functions accept variable amounts per recipient. Protocol fee (0.3%) is applied automatically.

## Use Cases

- **Payroll** — pay your team in one tx
- **Airdrops** — distribute tokens to your community
- **Bounties** — variable rewards to contributors
- **DAO distributions** — treasury payouts

## Links

- 🌐 Website: [spraay.app](https://spraay.app)
- 🐦 Twitter: [@lostpoet](https://twitter.com/lostpoet)
- 💜 Farcaster: [@plag](https://warpcast.com/plag)
- 💻 GitHub: [plagtech](https://github.com/plagtech)
- 📄 Contract: [BaseScan](https://basescan.org/address/0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC)
