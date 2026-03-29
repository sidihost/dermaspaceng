'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const bankAccounts = [
  { bank: 'Sterling Bank', number: '0072347862' },
  { bank: 'Access Bank', number: '0819975304' },
  { bank: 'Titan / Paystack', number: '9880301945' },
]

export default function BankAccountCards() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (number: string, index: number) => {
    navigator.clipboard.writeText(number)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="grid md:grid-cols-3 gap-3">
      {bankAccounts.map((account, i) => (
        <div 
          key={account.bank}
          className="bg-[#7B2D8E] rounded-xl p-4 text-white relative overflow-hidden group hover:shadow-lg transition-all"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">{account.bank}</p>
          <p className="text-lg font-mono font-bold tracking-wider">{account.number}</p>
          <button 
            className="mt-2 flex items-center gap-1.5 text-[10px] text-white/70 hover:text-white transition-colors"
            onClick={() => copyToClipboard(account.number, i)}
          >
            {copiedIndex === i ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
