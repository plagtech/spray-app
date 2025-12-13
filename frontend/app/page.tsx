'use client';

import { useState, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress } from 'viem';

const SPRAY_CONTRACT_ABI = [
  {
    inputs: [{ components: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'recipients', type: 'tuple[]' }],
    name: 'sprayETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

const SPRAY_CONTRACT_ADDRESS = '0x08fA5D1c16CD6E2a16FC0E4839f262429959E073';

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
  const [currentStep, setCurrentStep] = useState(1);

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

  const handleSpray = async () => {
    if (!isConnected) return;

    try {
      const recipientsData = recipients.map(r => ({
        recipient: r.address as `0x${string}`,
        amount: parseEther(r.amount),
      }));

      const totalAmount = recipientsData.reduce((sum, r) => sum + r.amount, 0n);
      const fee = (totalAmount * 30n) / 10000n;
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

  const isStep1Valid = recipients.every(r => isAddress(r.address));
  const isStep2Valid = recipients.every(r => parseFloat(r.amount || '0') > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Testnet Banner */}
      <div className="bg-yellow-500 text-black py-2 text-center text-sm font-medium">
        ⚠️ TESTNET MODE - Base Sepolia - Using Test ETH Only
      </div>

      {/* Header */}
      <header className="bg-white border-b">
  <div className="container mx-auto px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <img src="/images/spraay-logo.png" alt="Spraay" className="w-10 h-10 object-contain" />
      <h1 className="text-2xl font-bold text-slate-900">Spraay.app</h1>
    </div>
    <ConnectButton />
  </div>
</header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
  <div className="border-4 border-slate-900 rounded-2xl p-8 bg-white shadow-xl">
        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-3">
            Send to Multiple Recipients
          </h2>
          <p className="text-lg text-slate-600">
            Batch payments in three simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                currentStep >= step ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-24 h-1 ${currentStep > step ? 'bg-purple-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border p-8">
          {/* Step 1: Add Recipients */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Step 1: Add Recipients
              </h3>
              
              <div className="space-y-4 mb-6">
                {recipients.map((recipient, idx) => (
                  <div key={recipient.id} className="flex gap-3 items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded text-sm font-bold text-slate-600">
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      value={recipient.address}
                      onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
                      placeholder="0x... wallet address"
                      className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {recipients.length > 1 && (
                      <button
                        onClick={() => removeRecipient(recipient.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addRecipient}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-purple-500 hover:text-purple-600 font-medium"
              >
                + Add Another Recipient
              </button>

              <button
                onClick={() => setCurrentStep(2)}
                disabled={!isStep1Valid}
                className="w-full mt-6 py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Continue to Amounts →
              </button>
            </div>
          )}

          {/* Step 2: Set Amounts */}
          {currentStep === 2 && (
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Step 2: Set Amounts
              </h3>
              
              <div className="space-y-4 mb-6">
                {recipients.map((recipient, idx) => (
                  <div key={recipient.id} className="border rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-2">
                      Recipient {idx + 1}: {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        value={recipient.amount}
                        onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                        placeholder="0.01"
                        className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <span className="text-slate-600 font-medium">ETH</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-4 border-2 border-slate-300 rounded-lg font-bold hover:bg-slate-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!isStep2Valid}
                  className="flex-1 py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Review & Send →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Send */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Step 3: Review & Confirm
              </h3>
              
              <div className="space-y-4 mb-6">
                {/* Summary */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-600">Recipients</div>
                      <div className="text-2xl font-bold">{recipients.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Total Amount</div>
                      <div className="text-2xl font-bold">{calculateTotal().toFixed(4)} ETH</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Protocol Fee (0.3%)</div>
                      <div className="text-xl font-bold">{(calculateTotal() * 0.003).toFixed(6)} ETH</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Total Cost</div>
                      <div className="text-xl font-bold text-purple-600">{(calculateTotal() * 1.003).toFixed(4)} ETH</div>
                    </div>
                  </div>
                </div>

                {/* Recipient List */}
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {recipients.map((recipient, idx) => (
                    <div key={recipient.id} className="p-3 flex justify-between text-sm">
                      <div className="text-slate-600">
                        {idx + 1}. {recipient.address.slice(0, 10)}...{recipient.address.slice(-8)}
                      </div>
                      <div className="font-bold">{recipient.amount} ETH</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-4 border-2 border-slate-300 rounded-lg font-bold hover:bg-slate-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSpray}
                  disabled={!isConnected || isPending || isConfirming}
                  className="flex-1 py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {!isConnected ? 'Connect Wallet First' : 
                   isPending ? 'Confirming...' :
                   isConfirming ? 'Processing...' :
                   'Send Payment'}
                </button>
              </div>

              {/* Success Message */}
              {isSuccess && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    ✓ Payment Sent Successfully!
                  </div>
                  <a 
                    href={`https://sepolia.basescan.org/tx/${hash}`}
                    target="_blank"
                    className="text-sm text-green-600 underline mt-1 block"
                  >
                    View on BaseScan →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-slate-500">
          Need help? This is testnet mode using Base Sepolia test ETH.
        </div>
      </main>
    </div>
  );
}