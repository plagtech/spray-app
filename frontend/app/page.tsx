'use client';

import { useState, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import { base } from 'wagmi/chains';

// Contract ABI (simplified for this demo)
const SPRAY_CONTRACT_ABI = [
  {
    inputs: [{ components: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'recipients', type: 'tuple[]' }],
    name: 'sprayETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'totalAmount', type: 'uint256' }],
    name: 'calculateTotalCost',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Replace with your deployed contract address
const SPRAY_CONTRACT_ADDRESS = '0x...'; // TODO: Add your deployed address

interface Recipient {
  address: string;
  amount: string;
  id: string;
}

export default function SprayApp() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', address: '', amount: '' }
  ]);
  const [distributionMode, setDistributionMode] = useState<'custom' | 'equal'>('custom');
  const [equalAmount, setEqualAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      const parsed = lines.slice(1).map((line, idx) => {
        const [address, amount] = line.split(',').map(s => s.trim());
        return { id: Date.now().toString() + idx, address, amount };
      });

      setRecipients(parsed);
    };
    reader.readAsText(file);
  }, []);

  const calculateTotal = useCallback(() => {
    if (distributionMode === 'equal' && equalAmount) {
      return parseFloat(equalAmount) * recipients.length;
    }
    return recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [recipients, distributionMode, equalAmount]);

  const handleSpray = async () => {
    if (!isConnected) return;

    try {
      const recipientsData = recipients.map(r => ({
        recipient: r.address as `0x${string}`,
        amount: parseEther(distributionMode === 'equal' ? equalAmount : r.amount),
      }));

      const totalAmount = recipientsData.reduce((sum, r) => sum + r.amount, 0n);
      const fee = (totalAmount * 30n) / 10000n; // 0.3% fee
      const totalCost = totalAmount + fee;

      writeContract({
        address: SPRAY_CONTRACT_ADDRESS,
        abi: SPRAY_CONTRACT_ABI,
        functionName: 'sprayETH',
        args: [recipientsData],
        value: totalCost,
      });
    } catch (error) {
      console.error('Spray failed:', error);
    }
  };

  const isValid = recipients.every(r => isAddress(r.address) && parseFloat(r.amount || '0') > 0);

  if (isSuccess && !showSuccess) {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Animated background elements */}
      {/* Animated background elements */}
<div className="fixed inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl animate-pulse" />
  <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl animate-pulse" />
</div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm">
  <div className="container mx-auto px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/images/logo.jpg" alt="Spray" className="w-10 h-10 object-contain" />
        <div>
          <h1 className="text-2xl font-bold text-white">Spray</h1>
          <p className="text-sm text-purple-300">Multi-chain batch payments</p>
        </div>
      </div>
      <ConnectButton />
    </div>
  </div>
</header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-white mb-4 tracking-tight">
                Send to Many,
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  Pay Once
                </span>
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Batch your payments across multiple chains. Save on gas, save on time.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-12">
              {[
                { label: 'Total Recipients', value: recipients.length },
                { label: 'Total Amount', value: `${calculateTotal().toFixed(4)} ETH` },
                { label: 'Est. Fee', value: `${(calculateTotal() * 0.003).toFixed(4)} ETH` },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Main Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              {/* Distribution Mode */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-300 mb-3">Distribution Mode</label>
                <div className="flex gap-3">
                  {[
                    { value: 'custom', label: 'Custom Amounts' },
                    { value: 'equal', label: 'Equal Split' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setDistributionMode(mode.value as any)}
                      className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                        distributionMode === mode.value
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equal Amount Input */}
              {distributionMode === 'equal' && (
                <div className="mb-8">
                  <label className="block text-sm font-medium text-slate-300 mb-3">Amount per Recipient</label>
                  <input
                    type="number"
                    step="0.001"
                    value={equalAmount}
                    onChange={(e) => setEqualAmount(e.target.value)}
                    placeholder="0.1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              {/* CSV Upload */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-300 mb-3">Quick Import</label>
                <label className="flex items-center justify-center gap-3 py-4 px-6 bg-white/5 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 hover:border-purple-500/50 transition-all group">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-slate-300 group-hover:text-white">Upload CSV (address, amount)</span>
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>

              {/* Recipients List */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">Recipients</label>
                  <button
                    onClick={addRecipient}
                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Recipient
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {recipients.map((recipient, idx) => (
                    <div key={recipient.id} className="flex gap-3 items-start">
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-bold">
                            {idx + 1}
                          </div>
                          <input
                            type="text"
                            value={recipient.address}
                            onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
                            placeholder="0x..."
                            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:outline-none text-sm"
                          />
                        </div>
                        {distributionMode === 'custom' && (
                          <input
                            type="number"
                            step="0.001"
                            value={recipient.amount}
                            onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                            placeholder="0.1 ETH"
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                          />
                        )}
                      </div>
                      {recipients.length > 1 && (
                        <button
                          onClick={() => removeRecipient(recipient.id)}
                          className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSpray}
                disabled={!isConnected || !isValid || isPending || isConfirming}
                className="w-full py-5 px-8 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 disabled:shadow-none transition-all text-lg disabled:cursor-not-allowed"
              >
                {!isConnected ? 'Connect Wallet First' : 
                 isPending ? 'Confirming...' :
                 isConfirming ? 'Processing...' :
                 `Spray ${calculateTotal().toFixed(4)} ETH to ${recipients.length} Recipients`}
              </button>

              {/* Success Message */}
              {showSuccess && (
                <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <div className="font-medium text-green-300">Payment Sent!</div>
                      <div className="text-sm text-green-400/80">
                        View on <a href={`https://basescan.org/tx/${hash}`} target="_blank" className="underline">BaseScan</a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  icon: '⚡',
                  title: 'Lightning Fast',
                  desc: 'Send to hundreds in seconds'
                },
                {
                  icon: '🔒',
                  title: 'Fully Secured',
                  desc: 'Audited smart contracts'
                },
                {
                  icon: '🌐',
                  title: 'Multi-Chain',
                  desc: 'Base, Optimism, Arbitrum'
                }
              ].map((feature, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all">
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h3 className="text-white font-bold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 backdrop-blur-sm mt-20">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <div>© 2024 Spray. Built on Base.</div>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Docs</a>
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
                <a href="#" className="hover:text-white transition-colors">GitHub</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
