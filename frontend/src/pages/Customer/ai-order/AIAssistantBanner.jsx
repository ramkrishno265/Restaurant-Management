import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AIAssistantModal from './AIAssistantModal';

export default function AIAssistantBanner({ onAddToCart, customerName, tableId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-gradient-to-r from-orange-600/20 via-slate-800 to-slate-900 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md active:scale-[0.98] transition"
      >
        <div className="text-left">
          <p className="text-sm font-bold text-white">🤖 AI দিয়ে অর্ডার করুন</p>
          <p className="text-xs text-slate-400 mt-0.5">বলুন বা লিখুন, AI মেনু থেকে খুঁজে দেবে</p>
        </div>
        <Sparkles size={22} className="text-orange-400 shrink-0" />
      </button>

      {open && (
        <AIAssistantModal
          onClose={() => setOpen(false)}
          onAddToCart={onAddToCart}
          customerName={customerName}
          tableId={tableId}
        />
      )}
    </>
  );
}