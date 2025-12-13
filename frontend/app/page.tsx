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
    <div className="min-h-screen" style={{ backgroundColor: '#FFF9E6' }}>
      <div className="bg-yellow-500 text-black py-2 text-center text-sm font-medium">
        ⚠️ TESTNET MODE - Base Sepolia - Using Test ETH Only
      </div>

      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              S
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Spraay.app</h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div style={{ 
            border: '8px solid #1e293b', 
            borderRadius: '24px', 
            padding: '60px', 
            backgroundColor: '#ffffff', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            margin: '0 auto'
          }}>
            
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-slate-900 mb-4">
                Send Crypto to Multiple Recipients
              </h2>
              <p className="text-xl text-slate-600">
                Batch payments in three simple steps
              </p>
            </div>

            <div className="flex items-center justify-center mb-12">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-full font-bold text-xl ${
                    currentStep >= step ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-32 h-2 ${currentStep > step ? 'bg-purple-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>

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
                            step="0.001"
                            value={recipient.amount}
                            onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                            placeholder="0.01"
                            className="flex-1 px-4 py-4 text-lg border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                          />
                          <span className="text-slate-600 font-bold text-lg">ETH</span>
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
                          <div className="text-4xl font-bold">{calculateTotal().toFixed(4)} ETH</div>
                        </div>
                        <div>
                          <div className="text-base text-slate-600 mb-2">Protocol Fee (0.3%)</div>
                          <div className="text-2xl font-bold">{(calculateTotal() * 0.003).toFixed(6)} ETH</div>
                        </div>
                        <div>
                          <div className="text-base text-slate-600 mb-2">Total Cost</div>
                          <div className="text-3xl font-bold text-purple-600">{(calculateTotal() * 1.003).toFixed(4)} ETH</div>
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg divide-y max-h-64 overflow-y-auto">
                      {recipients.map((recipient, idx) => (
                        <div key={recipient.id} className="p-4 flex justify-between text-base">
                          <div className="text-slate-600">
                            {idx + 1}. {recipient.address.slice(0, 10)}...{recipient.address.slice(-8)}
                          </div>
                          <div className="font-bold">{recipient.amount} ETH</div>
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
                    <button
                      onClick={handleSpray}
                      disabled={!isConnected || isPending || isConfirming}
                      className="flex-1 py-5 bg-purple-600 text-white rounded-lg font-bold text-xl hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {!isConnected ? 'Connect Wallet First' : 
                       isPending ? 'Confirming...' :
                       isConfirming ? 'Processing...' :
                       'Send Payment'}
                    </button>
                  </div>

                  {isSuccess && (
                    <div className="mt-6 p-5 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 font-bold text-lg">
                        ✓ Payment Sent Successfully!
                      </div>
                      <a 
                        href={`https://sepolia.basescan.org/tx/${hash}`}
                        target="_blank"
                        className="text-base text-green-600 underline mt-2 block font-medium"
                      >
                        View on BaseScan →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-10 text-center text-base text-slate-500">
              Need help? This is testnet mode using Base Sepolia test ETH.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
