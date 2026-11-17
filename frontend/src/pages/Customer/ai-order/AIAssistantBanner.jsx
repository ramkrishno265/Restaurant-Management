import React, { useState } from 'react';
import AIAssistantModal from './AIAssistantModal';

export default function AIAssistantBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer mb-4 relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 p-[1px] transition-all hover:scale-[1.01]"
      >
        <div className="bg-[#121826] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xl">
              🤖
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">এআই ভয়েস অ্যাসিস্ট্যান্ট</h4>
              <p className="text-xs text-gray-400">কথা বলে সহজেই অর্ডার করুন!</p>
            </div>
          </div>
          <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg animate-pulse">
            শুরু করুন 🎙️
          </span>
        </div>
      </div>

      {/* মোডাল কম্পোনেন্ট */}
      {isModalOpen && <AIAssistantModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}