import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { TrendingUp, CheckCircle, Clock, XCircle, ChefHat } from 'lucide-react';

const AdminOrders = () => {
  const { orders, setOrders } = useOutletContext();
  const socket = useSocket();
  const [cookingTimes, setCookingTimes] = useState({});

  // ✅ Duplicate order hatiye unique list banano (same id hole shesh ta rakhe)
  const uniqueOrders = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => map.set(String(o.id), o));
    return Array.from(map.values());
  }, [orders]);

  // ✅ 1. Initial fetch (alada effect)
  useEffect(() => {
    API.get('/orders/active')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error('Error fetching orders:', err));
  }, [setOrders]);

  // ✅ 2. Socket listener (alada effect, thik cleanup shoho)
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_admin');

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => {
        const exists = prev.some((o) => String(o.id) === String(newOrder.id));
        return exists
          ? prev.map((o) => (String(o.id) === String(newOrder.id) ? newOrder : o))
          : [newOrder, ...prev];
      });
    };

    socket.on('new_order', handleNewOrder);

    return () => {
      socket.off('new_order', handleNewOrder);
    };
  }, [socket, setOrders]);

  // 3. Status Change Handler
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const payload = { status: newStatus };

      if (newStatus === 'COOKING') {
        const mins = cookingTimes[orderId] || 20;
        payload.estimatedMinutes = Number(mins);
      }

      await API.patch(`/orders/${orderId}/status`, payload);

      setOrders((prev) =>
        prev
          .map((o) =>
            String(o.id) === String(orderId)
              ? { ...o, status: newStatus, estimatedMinutes: payload.estimatedMinutes }
              : o
          )
          .filter((o) =>
            newStatus === 'SERVED' || newStatus === 'CANCELLED'
              ? String(o.id) !== String(orderId)
              : true
          )
      );
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  // 4. Cancel Order Handler
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await API.patch(`/orders/${orderId}/cancel`);
      setOrders((prev) => prev.filter((o) => String(o.id) !== String(orderId)));
    } catch (err) {
      alert('Failed to cancel order');
    }
  };

  // Status Badge Styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'COOKING':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'READY':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'SERVED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="text-orange-500" size={20} /> Live Table Orders
      </h2>

      {uniqueOrders.length === 0 ? (
        <p className="text-center py-12 text-slate-500">Kono active order nei ekhon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {uniqueOrders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Header: Table Number & Status */}
                <div className="flex justify-between items-center border-b border-slate-700/80 pb-3 mb-3">
                  <div>
                    <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-lg text-sm font-extrabold">
                      Table #{order.table?.tableNumber || order.tableId}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Customer: {order.customerName || 'Guest'}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getStatusBadgeClass(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                  {order.orderItems?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-slate-300">
                      <span>{item.menuItem?.name || `Item #${item.menuItemId}`}</span>
                      <span className="font-bold text-orange-400">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {/* Cooking Time Input Box */}
                {order.status === 'PENDING' && (
                  <div className="mb-3 flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-300 font-medium">Est. Mins:</span>
                    <input
                      type="number"
                      min="1"
                      defaultValue={cookingTimes[order.id] || 20}
                      onChange={(e) =>
                        setCookingTimes((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      className="w-16 bg-slate-800 border border-slate-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                {/* Total & Action Buttons */}
                <div className="pt-3 border-t border-slate-700/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400">Total Bill:</span>
                    <p className="text-lg font-black text-white">৳{order.totalAmount}</p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'COOKING')}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition"
                      >
                        <ChefHat size={14} /> Start Cooking
                      </button>
                    )}

                    {order.status === 'COOKING' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition"
                      >
                        <CheckCircle size={14} /> Mark Ready
                      </button>
                    )}

                    {order.status !== 'SERVED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'SERVED')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition"
                      >
                        <CheckCircle size={14} /> Mark Served
                      </button>
                    )}

                    {order.status !== 'SERVED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 p-2 rounded-lg transition"
                        title="Cancel Order"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;