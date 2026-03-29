'use client'

import { useState } from 'react'
import { Copy, Check, CreditCard } from 'lucide-react'

const bankAccounts = [
  { bank: 'Sterling Bank', number: '0072347862', color: 'from-[#7B2D8E] to-[#5B1D6E]' },
  { bank: 'Access Bank', number: '0819975304', color: 'from-[#8B3D9E] to-[#6B2D7E]' },
  { bank: 'Titan / Paystack', number: '9880301945', color: 'from-[#9B4DAE] to-[#7B2D8E]' },
]

export default function BankAccountCards() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (number: string, index: number) => {
    navigator.clipboard.writeText(number)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {bankAccounts.map((account, i) => (
        <div 
          key={account.bank}
          className={`relative bg-gradient-to-br ${account.color} rounded-3xl p-6 text-white overflow-hidden group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          {/* Card icon */}
          <div className="flex items-center justify-between mb-6">
            <CreditCard className="w-8 h-8 text-white/40" />
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <div className="w-2 h-2 rounded-full bg-white/70" />
            </div>
          </div>
          
          {/* Account number */}
          <p className="text-2xl font-mono font-bold tracking-[0.2em] mb-4">
            {account.number.slice(0, 4)} {account.number.slice(4, 7)} {account.number.slice(7)}
          </p>
          
          {/* Bank name and copy */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-0.5">Bank</p>
              <p className="text-sm font-semibold">{account.bank}</p>
            </div>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-sm"
              onClick={() => copyToClipboard(account.number, i)}
            >
              {copiedIndex === i ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
