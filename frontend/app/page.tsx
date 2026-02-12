'use client';

import { useState, useCallback, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract } from 'wagmi';
import { parseEther, parseUnits, isAddress, erc20Abi } from 'viem';

const SPRAY_CONTRACT_ABI = [
  {
    inputs: [{ components: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'recipients', type: 'tuple[]' }],
    name: 'sprayETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { components: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'recipients', type: 'tuple[]' },
    ],
    name: 'sprayERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  8453: '0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC',   // Base
  9745: '0x08fA5D1c16CD6E2a16FC0E4839f262429959E073',   // Plasma
  10: '0x08fA5D1c16CD6E2a16FC0E4839f262429959E073',     // Optimism
  42161: '0x08fA5D1c16CD6E2a16FC0E4839f262429959E073',  // Arbitrum
  137: '0x08fA5D1c16CD6E2a16FC0E4839f262429959E073',    // Polygon
};

const CHAIN_CONFIG: Record<number, { name: string; symbol: string; explorer: string }> = {
  8453: { name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org/tx/' },
  9745: { name: 'Plasma', symbol: 'XPL', explorer: 'https://plasmascan.to/tx/' },
  10: { name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io/tx/' },
  42161: { name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io/tx/' },
  137: { name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com/tx/' },
};

interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

const CHAIN_TOKENS: Record<number, TokenInfo[]> = {
  9745: [
    { address: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb', symbol: 'USDT0', decimals: 6 },
  ],
  8453: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
    { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', decimals: 18 },
  ],
  10: [
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
  ],
  42161: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
  ],
  137: [
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6 },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
  ],
};

interface Recipient {
  address: string;
  amount: string;
  id: string;
}

export default function SprayApp() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const contractAddress = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[8453];
  const chainConfig = CHAIN_CONFIG[chainId] || CHAIN_CONFIG[8453];
  const availableTokens = CHAIN_TOKENS[chainId] || [];

  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', address: '', amount: '' }
  ]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedToken, setSelectedToken] = useState<'native' | string>('native');
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>();
  const [isApproving, setIsApproving] = useState(false);

  const activeToken = selectedToken === 'native'
    ? null
    : availableTokens.find(t => t.address === selectedToken) || null;

  const tokenSymbol = activeToken ? activeToken.symbol : chainConfig.symbol;
  const tokenDecimals = activeToken ? activeToken.decimals : 18;

  // Reset token selection when chain changes
  useEffect(() => {
    setSelectedToken('native');
    resetWrite?.();
  }, [chainId]);

  // Check current allowance for ERC-20
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: activeToken?.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && activeToken ? [address, contractAddress] : undefined,
    query: { enabled: !!activeToken && !!address },
  });

  // Wait for approval tx
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // Refetch allowance after approval confirms
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance();
      setIsApproving(false);
      setApprovalHash(undefined);
    }
  }, [isApprovalSuccess, refetchAllowance]);

  const addRecipient = useCallback(() => {
    setRecipients(prev => [...prev, { id: Date.now().toString(), address: '', amount: '' }]);
  }, []);

  const removeRecipient = useCallback((id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  }, []);

  const updateRecipient = useCallback((id: string, field: 'address' | 'amount', value: string) => {
    setRecipients(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  const calculateTotal = useCallback(() => {
    return recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [recipients]);

  const calculateTotalBigInt = useCallback(() => {
    return recipients.reduce((sum, r) => {
      if (!r.amount || parseFloat(r.amount) <= 0) return sum;
      return sum + parseUnits(r.amount, tokenDecimals);
    }, 0n);
  }, [recipients, tokenDecimals]);

  const needsApproval = useCallback(() => {
    if (!activeToken) return false;
    const totalAmount = calculateTotalBigInt();
    const fee = (totalAmount * 30n) / 10000n;
    const required = totalAmount + fee;
    return (currentAllowance ?? 0n) < required;
  }, [activeToken, calculateTotalBigInt, currentAllowance]);

  const handleApprove = async () => {
    if (!activeToken || !isConnected) return;
    setIsApproving(true);

    try {
      const totalAmount = calculateTotalBigInt();
      const fee = (totalAmount * 30n) / 10000n;
      const required = totalAmount + fee;

      writeContract({
        address: activeToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contractAddress, required],
      });
    } catch (error) {
      console.error('Approval failed:', error);
      setIsApproving(false);
    }
  };

  // Capture approval hash from writeContract
  useEffect(() => {
    if (hash && isApproving) {
      setApprovalHash(hash);
    }
  }, [hash, isApproving]);

  const handleSpray = async () => {
    if (!isConnected) return;

    try {
      if (activeToken) {
        // ERC-20 spray
        const recipientsData = recipients.map(r => ({
          recipient: r.address as `0x${string}`,
          amount: parseUnits(r.amount, activeToken.decimals),
        }));

        writeContract({
          address: contractAddress,
          abi: SPRAY_CONTRACT_ABI,
          functionName: 'sprayERC20',
          args: [activeToken.address, recipientsData],
        });
      } else {
        // Native token spray
        const recipientsData = recipients.map(r => ({
          recipient: r.address as `0x${string}`,
          amount: parseEther(r.amount),
        }));

        const totalAmount = recipientsData.reduce((sum, r) => sum + r.amount, 0n);
        const fee = (totalAmount * 30n) / 10000n;
        const totalCost = totalAmount + fee;

        writeContract({
          address: contractAddress,
          abi: SPRAY_CONTRACT_ABI,
          functionName: 'sprayETH',
          args: [recipientsData],
          value: totalCost,
        });
      }
    } catch (error) {
      console.error('Spray failed:', error);
    }
  };

  const isStep1Valid = recipients.every(r => isAddress(r.address));
  const isStep2Valid = recipients.every(r => parseFloat(r.amount || '0') > 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF9E6' }}>
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/spraay-logo.png" alt="Spraay" className="w-12 h-12 object-contain" />
            <h1 className="text-3xl font-bold text-slate-900">Spraay.app</h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div style={{
            borderRadius: '24px',
            padding: '60px',
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
          }}>

            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-slate-900 mb-4">
                Send Crypto to Multiple Recipients
              </h2>
              <p className="text-xl text-slate-600">
                Batch payments in three simple steps
              </p>
              {isConnected && (
                <p className="text-sm text-purple-600 mt-2 font-medium">
                  Connected to {chainConfig.name}
                </p>
              )}
            </div>

            {/* Token Selector */}
            {isConnected && (
              <div className="mb-8">
                <label className="block text-base font-medium text-slate-700 mb-3">Select Token</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedToken('native')}
                    className={`px-5 py-3 rounded-lg font-bold text-base border-2 transition-colors ${
                      selectedToken === 'native'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-600 hover:border-purple-300'
                    }`}
                  >
                    {chainConfig.symbol}
                  </button>
                  {availableTokens.map(token => (
                    <button
                      key={token.address}
                      onClick={() => setSelectedToken(token.address)}
                      className={`px-5 py-3 rounded-lg font-bold text-base border-2 transition-colors ${
                        selectedToken === token.address
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-slate-200 text-slate-600 hover:border-purple-300'
                      }`}
                    >
                      {token.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              {currentStep === 1 && (
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-8">
                    Step 1: Add Recipients
                  </h3>

                  <div className="space-y-4 mb-6">
                    {recipients.map((recipient, idx) => (
                      <div key={recipient.id} className="flex gap-3 items-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded text-base font-bold text-slate-600">
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          value={recipient.address}
                          onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
                          placeholder="0x... wallet address"
                          className="flex-1 px-4 py-4 text-lg border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                        {recipients.length > 1 && (
                          <button
                            onClick={() => removeRecipient(recipient.id)}
                            className="p-3 text-red-600 hover:bg-red-50 rounded font-bold text-xl"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addRecipient}
                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-purple-500 hover:text-purple-600 font-medium text-lg"
                  >
                    + Add Another Recipient
                  </button>

                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!isStep1Valid}
                    className="w-full mt-8 py-5 bg-purple-600 text-white rounded-lg font-bold text-xl hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Continue to Amounts →
                  </button>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-8">
                    Step 2: Set Amounts
                  </h3>

                  <div className="space-y-4 mb-6">
                    {recipients.map((recipient, idx) => (
                      <div key={recipient.id} className="border-2 rounded-lg p-5">
                        <div className="text-base text-slate-600 mb-3 font-medium">
                          Recipient {idx + 1}: {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step={activeToken ? (activeToken.decimals === 6 ? '0.01' : '0.001') : '0.001'}
                            value={recipient.amount}
                            onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                            placeholder={activeToken ? '1.00' : '0.01'}
                            className="flex-1 px-4 py-4 text-lg border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                          />
                          <span className="text-slate-600 font-bold text-lg">{tokenSymbol}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 py-5 border-2 border-slate-300 rounded-lg font-bold text-xl hover:bg-slate-50"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      disabled={!isStep2Valid}
                      className="flex-1 py-5 bg-purple-600 text-white rounded-lg font-bold text-xl hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      Review & Send →
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-8">
                    Step 3: Review & Confirm
                  </h3>

                  <div className="space-y-4 mb-6">
                    <div className="bg-slate-50 rounded-lg p-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <div className="text-base text-slate-600 mb-2">Recipients</div>
                          <div className="text-4xl font-bold">{recipients.length}</div>
                        </div>
                        <div>
                          <div className="text-base text-slate-600 mb-2">Total Amount</div>
                          <div className="text-4xl font-bold">{calculateTotal().toFixed(activeToken ? 2 : 4)} {tokenSymbol}</div>
                        </div>
                        <div>
                          <div className="text-base text-slate-600 mb-2">Protocol Fee (0.3%)</div>
                          <div className="text-2xl font-bold">{(calculateTotal() * 0.003).toFixed(activeToken ? 4 : 6)} {tokenSymbol}</div>
                        </div>
                        <div>
                          <div className="text-base text-slate-600 mb-2">Total Cost</div>
                          <div className="text-3xl font-bold text-purple-600">{(calculateTotal() * 1.003).toFixed(activeToken ? 2 : 4)} {tokenSymbol}</div>
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg divide-y max-h-64 overflow-y-auto">
                      {recipients.map((recipient, idx) => (
                        <div key={recipient.id} className="p-4 flex justify-between text-base">
                          <div className="text-slate-600">
                            {idx + 1}. {recipient.address.slice(0, 10)}...{recipient.address.slice(-8)}
                          </div>
                          <div className="font-bold">{recipient.amount} {tokenSymbol}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 py-5 border-2 border-slate-300 rounded-lg font-bold text-xl hover:bg-slate-50"
                    >
                      ← Back
                    </button>

                    {activeToken && needsApproval() ? (
                      <button
                        onClick={handleApprove}
                        disabled={!isConnected || isApproving || isApprovalConfirming}
                        className="flex-1 py-5 bg-amber-500 text-white rounded-lg font-bold text-xl hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        {isApproving || isApprovalConfirming
                          ? 'Approving...'
                          : `Approve ${tokenSymbol}`}
                      </button>
                    ) : (
                      <button
                        onClick={handleSpray}
                        disabled={!isConnected || isPending || isConfirming}
                        className="flex-1 py-5 bg-purple-600 text-white rounded-lg font-bold text-xl hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        {!isConnected ? 'Connect Wallet First' :
                         isPending ? 'Confirming...' :
                         isConfirming ? 'Processing...' :
                         `Send ${tokenSymbol} Payment`}
                      </button>
                    )}
                  </div>

                  {isSuccess && !isApproving && (
                    <div className="mt-6 p-5 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 font-bold text-lg">
                        ✓ Payment Sent Successfully!
                      </div>
                      <a
                        href={`${chainConfig.explorer}${hash}`}
                        target="_blank"
                        className="text-base text-green-600 underline mt-2 block font-medium"
                      >
                        View on {chainConfig.name} Explorer →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-10 text-center text-base text-slate-500">
              Supported chains: Base • Plasma • Optimism • Arbitrum • Polygon
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
