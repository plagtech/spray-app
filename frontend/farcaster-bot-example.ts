// farcaster-bot.ts
// Example Farcaster bot integration for Spray
// This is a conceptual implementation showing the structure

import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { parseEther, Address } from 'viem';

// Initialize Neynar client
const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY!);

interface ParsedCommand {
  action: 'send' | 'spray' | 'tip';
  amount: string;
  token: string;
  recipients: Address[];
  isEqualSplit: boolean;
}

/**
 * Parse a Farcaster cast into a spray command
 * Example: "@spraybot send 50 USDC to @alice @bob @charlie"
 */
export function parseSprayCommand(castText: string): ParsedCommand | null {
  // Remove bot mention
  const text = castText.replace(/@spraybot\s*/gi, '').trim();
  
  // Match pattern: "send/spray/tip [amount] [token] to @user1 @user2..."
  const match = text.match(
    /^(send|spray|tip)\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(.+)$/i
  );
  
  if (!match) return null;
  
  const [, action, amount, token, recipientsStr] = match;
  
  // Extract mentioned users
  const mentions = recipientsStr.match(/@\w+/g) || [];
  
  return {
    action: action.toLowerCase() as 'send' | 'spray' | 'tip',
    amount,
    token: token.toUpperCase(),
    recipients: mentions.map(m => m.substring(1)) as Address[], // Remove @
    isEqualSplit: true,
  };
}

/**
 * Resolve Farcaster usernames to wallet addresses
 */
export async function resolveWalletAddresses(
  usernames: string[]
): Promise<Record<string, Address>> {
  const resolved: Record<string, Address> = {};
  
  for (const username of usernames) {
    try {
      const user = await neynarClient.lookupUserByUsername(username);
      // Get verified addresses or custody address
      const address = user.verifiedAddresses?.[0] || user.custodyAddress;
      if (address) {
        resolved[username] = address as Address;
      }
    } catch (error) {
      console.error(`Failed to resolve ${username}:`, error);
    }
  }
  
  return resolved;
}

/**
 * Generate a Farcaster Frame for transaction confirmation
 */
export function generateSprayFrame(command: ParsedCommand, totalCost: string) {
  const recipientsList = command.recipients.map(r => `• ${r}`).join('\n');
  
  return {
    version: 'vNext',
    image: {
      url: `${process.env.BASE_URL}/api/frames/preview?recipients=${command.recipients.length}&amount=${command.amount}&token=${command.token}`,
      aspectRatio: '1.91:1',
    },
    buttons: [
      {
        label: `Send ${command.amount} ${command.token}`,
        action: 'tx',
        target: `${process.env.BASE_URL}/api/frames/execute`,
        postUrl: `${process.env.BASE_URL}/api/frames/success`,
      },
      {
        label: 'Cancel',
        action: 'post',
      },
    ],
    input: {
      text: 'Optional message',
    },
    postUrl: `${process.env.BASE_URL}/api/frames/confirm`,
  };
}

/**
 * Handle incoming webhook from Farcaster
 */
export async function handleFarcasterWebhook(cast: any) {
  // Check if bot is mentioned
  if (!cast.text.includes('@spraybot')) {
    return;
  }
  
  // Parse the command
  const command = parseSprayCommand(cast.text);
  if (!command) {
    await replyToCast(cast.hash, 'Invalid command. Use: @spraybot send [amount] [token] to @user1 @user2');
    return;
  }
  
  // Resolve wallet addresses
  const addresses = await resolveWalletAddresses(command.recipients);
  const resolvedCount = Object.keys(addresses).length;
  
  if (resolvedCount === 0) {
    await replyToCast(cast.hash, 'Could not resolve any recipient addresses.');
    return;
  }
  
  if (resolvedCount < command.recipients.length) {
    await replyToCast(
      cast.hash,
      `Warning: Only resolved ${resolvedCount}/${command.recipients.length} recipients.`
    );
  }
  
  // Calculate total cost
  const amountPerRecipient = parseEther(command.amount);
  const total = amountPerRecipient * BigInt(resolvedCount);
  const fee = (total * 30n) / 10000n; // 0.3%
  const totalCost = total + fee;
  
  // Generate confirmation frame
  const frame = generateSprayFrame(command, totalCost.toString());
  
  // Reply with frame
  await replyWithFrame(cast.hash, frame);
}

/**
 * Reply to a cast with text
 */
async function replyToCast(parentHash: string, text: string) {
  try {
    await neynarClient.publishCast({
      text,
      parent: parentHash,
      signerUuid: process.env.SIGNER_UUID!,
    });
  } catch (error) {
    console.error('Failed to reply:', error);
  }
}

/**
 * Reply to a cast with a Frame
 */
async function replyWithFrame(parentHash: string, frame: any) {
  try {
    await neynarClient.publishCast({
      text: 'Review and confirm your spray:',
      parent: parentHash,
      embeds: [{ url: `${process.env.BASE_URL}/api/frames/spray` }],
      signerUuid: process.env.SIGNER_UUID!,
    });
  } catch (error) {
    console.error('Failed to reply with frame:', error);
  }
}

/**
 * Example Next.js API route for webhook
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (important for security)
    // const isValid = verifyNeynarSignature(body, request.headers);
    // if (!isValid) return new Response('Unauthorized', { status: 401 });
    
    // Process the cast
    await handleFarcasterWebhook(body.data);
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}

/**
 * Example Frame transaction endpoint
 */
export async function generateTransactionData(
  recipients: Address[],
  amounts: bigint[],
  token: Address
) {
  // Generate the transaction data for the Frame to execute
  // This would use viem's encodeFunctionData
  
  return {
    chainId: 'eip155:8453', // Base
    method: 'eth_sendTransaction',
    params: {
      abi: SPRAY_CONTRACT_ABI,
      to: SPRAY_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: SPRAY_CONTRACT_ABI,
        functionName: 'sprayETH',
        args: [
          recipients.map((addr, i) => ({
            recipient: addr,
            amount: amounts[i],
          })),
        ],
      }),
      value: amounts.reduce((sum, amt) => sum + amt, 0n).toString(),
    },
  };
}

// Export for use in your app
export {
  parseSprayCommand,
  resolveWalletAddresses,
  generateSprayFrame,
  handleFarcasterWebhook,
};

/**
 * EXAMPLE USAGE IN YOUR APP
 * 
 * 1. Set up webhook endpoint:
 *    POST /api/farcaster/webhook
 *    - Receives notifications when bot is mentioned
 *    - Parses commands
 *    - Generates confirmation frames
 * 
 * 2. Set up Frame endpoints:
 *    GET /api/frames/preview - Generate preview image
 *    POST /api/frames/confirm - Handle confirmation
 *    POST /api/frames/execute - Generate transaction data
 *    POST /api/frames/success - Handle success callback
 * 
 * 3. Configure Neynar webhook:
 *    - Go to Neynar dashboard
 *    - Add webhook URL
 *    - Subscribe to 'cast.created' events
 *    - Filter for mentions of your bot
 * 
 * 4. Environment variables needed:
 *    NEYNAR_API_KEY=xxx
 *    SIGNER_UUID=xxx (created in Neynar dashboard)
 *    BASE_URL=https://spray.app
 * 
 * 5. Farcaster bot account:
 *    - Create bot account on Warpcast
 *    - Register in Neynar
 *    - Get signer from Neynar
 */

// Sample commands users can use:
const SAMPLE_COMMANDS = [
  '@spraybot send 50 USDC to @alice @bob @charlie',
  '@spraybot spray 0.1 ETH to @dan @eve @frank',
  '@spraybot tip 10 DEGEN to everyone who replied',
  '@spraybot send 100 USDC equally to thread participants',
];
