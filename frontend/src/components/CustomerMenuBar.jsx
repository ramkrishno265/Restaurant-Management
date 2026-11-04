import React, { useState } from 'react';
import { 
  Utensils, 
  Bell, 
  Menu, 
  X, 
  User, 
  Phone, 
  Droplets, 
  FileText, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

const CustomerMenuBar = ({ tableId, customerInfo, onServiceRequest }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleServiceClick = (type) => {
    if (onServiceRequest) {
      onServiceRequest(type);
    }
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* 1. TOP HEADER NAVBAR */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 backdrop-blur-md flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          {/* Sidebar Menu Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl hover:bg-slate-700 active:scale-95 transition"
            title="Open Menu Sidebar"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-1.5 tracking-wide">
              <Utensils size={16} className="text-orange-500" /> Digital Menu
            </h1>
            <p className="text-[11px] text-slate-400">
              Table <span className="text-orange-400 font-bold">#{tableId}</span>
            </p>
          </div>
        </div>

        {/* Quick Waiter Call Button */}
        <button
          onClick={() => handleServiceClick('CALL_WAITER')}
          className="bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 active:scale-95 px-3 py-1.5 rounded-xl text-orange-400 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
        >
          <Bell size={14} /> Waiter Dakun
        </button>
      </header>

      {/* 2. SLIDING SIDEBAR DRAWER */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Sidebar Container */}
          <div className="relative w-72 bg-slate-900 border-r border-slate-800 h-full p-6 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            <div>
              {/* Sidebar Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-xl flex items-center justify-center font-bold">
                    #{tableId}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Table #{tableId}</h3>
                    <p className="text-[10px] text-slate-400">Customer Panel</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Customer Info Card */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-6 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-orange-400" /> Customer Info
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    <User size={13} className="text-orange-400" /> {customerInfo?.name || 'Guest'}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Phone size={13} className="text-orange-400" /> {customerInfo?.phone || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Service Actions Navigation */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Quick Actions</p>
                <button
                  onClick={() => handleServiceClick('CALL_WAITER')}
                  className="w-full bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition"
                >
                  <Bell size={16} className="text-orange-400" /> Waiter Dakun
                </button>
                <button
                  onClick={() => handleServiceClick('WATER')}
                  className="w-full bg-slate-800 hover:bg-slate-700/80 text-cyan-400 border border-slate-700 p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition"
                >
                  <Droplets size={16} /> Pani Request
                </button>
                <button
                  onClick={() => handleServiceClick('TISSUE')}
                  className="w-full bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700 p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition"
                >
                  <FileText size={16} /> Tissue Request
                </button>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <HelpCircle size={14} />
                <span>Kono lagle Waiter-ke bolun</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerMenuBar;