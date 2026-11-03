import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, CheckCircle } from 'lucide-react';

const AdminRequests = () => {
  const { serviceRequests, setServiceRequests } = useOutletContext();

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Bell className="text-orange-500" size={20} /> Customer Requests
      </h2>

      {serviceRequests.length === 0 ? (
        <p className="text-center py-12 text-slate-500">Kono new service request nei.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceRequests.map((req, idx) => (
            <div key={idx} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Table #{req.table?.tableNumber || req.tableId}</p>
                <p className="text-xs text-orange-400 font-semibold mt-1">Requested: {req.type}</p>
              </div>
              <button
                onClick={() => setServiceRequests((prev) => prev.filter((_, i) => i !== idx))}
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition"
              >
                <CheckCircle size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRequests;