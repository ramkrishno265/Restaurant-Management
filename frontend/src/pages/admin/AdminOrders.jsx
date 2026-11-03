import React from 'react';
import { useOutletContext } from 'react-router-dom';
import API from '../../services/api';
import { TrendingUp, CheckCircle } from 'lucide-react';

const AdminOrders = () => {
  const { orders, setOrders } = useOutletContext();

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await API.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="text-orange-500" size={20} /> Live Table Orders
      </h2>

      {orders.length === 0 ? (
        <p className="text-center py-12 text-slate-500">Kono active order nei ekhon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => (
            <div key={order.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex justify-between items-center border-b border-slate-700/80 pb-3 mb-3">
                  <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-lg text-sm font-extrabold">
                    Table #{order.table?.tableNumber || order.tableId}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {order.status}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {order.orderItems?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-slate-300">
                      <span>{item.menuItem?.name || `Item #${item.menuItemId}`}</span>
                      <span className="font-bold text-orange-400">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between mt-2">
                <p className="text-lg font-black text-white">৳{order.totalAmount}</p>
                {order.status !== 'SERVED' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'SERVED')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <CheckCircle size={14} /> Mark Served
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;