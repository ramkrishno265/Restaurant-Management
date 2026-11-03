import React from 'react';
import { useOutletContext } from 'react-router-dom';
import API from '../../services/api';
import { Utensils, ToggleLeft, ToggleRight } from 'lucide-react';

const AdminMenu = () => {
  const { menuItems, setMenuItems } = useOutletContext();

  const toggleAvailability = async (itemId, currentStatus) => {
    try {
      await API.patch(`/menu/items/${itemId}/toggle`, { isAvailable: !currentStatus });
    } catch (e) {}
    setMenuItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, isAvailable: !currentStatus } : item))
    );
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Utensils className="text-orange-500" size={20} /> Menu Availability Control
        </h2>
        <p className="text-xs text-slate-400 mt-1">Ajke kon kon khabar chalu ba bondho thakbe seta Stock Toggle-e switch korun.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border flex items-center justify-between transition ${
              item.isAvailable ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/50 border-slate-800 opacity-60'
            }`}
          >
            <div>
              <h4 className="font-bold text-slate-200">{item.name}</h4>
              <p className="text-xs text-orange-400 font-semibold mt-0.5">৳{item.price}</p>
            </div>
            <button
              onClick={() => toggleAvailability(item.id, item.isAvailable)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                item.isAvailable ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {item.isAvailable ? <><ToggleRight size={18} /> Stock On</> : <><ToggleLeft size={18} /> Stock Off</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMenu;