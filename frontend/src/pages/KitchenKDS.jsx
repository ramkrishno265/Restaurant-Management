import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';
import { ChefHat, CheckCircle, Clock } from 'lucide-react';

const KitchenKDS = () => {
  const socket = useSocket();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // 1. Fetch Active Orders
    API.get('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err));

    // 2. Join Socket Kitchen Room & Listen for New Orders
    if (socket) {
      socket.emit('join_dashboard', 'kitchen');

      socket.on('new_order', (newOrder) => {
        setOrders((prev) => [newOrder, ...prev]);
        // Sound alert for new order
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        } catch (e) {}
      });

      socket.on('order_status_updated', (updatedOrder) => {
        setOrders((prev) =>
          prev
            .map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
            .filter((o) => o.status !== 'SERVED' && o.status !== 'CANCELLED')
        );
      });
    }
  }, [socket]);

  // Update Status Logic
  const updateStatus = async (orderId, newStatus) => {
    try {
      await API.patch(`/orders/${orderId}/status`, { status: newStatus });
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <ChefHat size={32} className="text-orange-500" />
          <h1 className="text-2xl font-bold">Kitchen Display System (KDS)</h1>
        </div>
        <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-sm font-semibold border border-orange-500/20">
          Live Orders: {orders.length}
        </span>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`rounded-xl p-5 border shadow-lg flex flex-col justify-between ${
              order.status === 'PENDING'
                ? 'bg-amber-950/30 border-amber-500/50'
                : 'bg-blue-950/30 border-blue-500/50'
            }`}
          >
            <div>
              {/* Order Header */}
              <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-3">
                <div>
                  <h2 className="text-xl font-bold text-orange-400">
                    Table #{order.table?.tableNumber || order.tableId}
                  </h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    order.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2 my-4">
                {order.orderItems?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm border-b border-gray-800/50 pb-1">
                    <span className="font-semibold text-gray-200">
                      {item.menuItem?.name || `Item #${item.menuItemId}`}
                    </span>
                    <span className="font-bold text-orange-400">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              {order.specialRequest && (
                <p className="text-xs bg-red-950/50 text-red-300 p-2 rounded border border-red-800/30 my-2">
                  <strong>Note:</strong> {order.specialRequest}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-gray-800">
              {order.status === 'PENDING' ? (
                <button
                  onClick={() => updateStatus(order.id, 'COOKING')}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg transition"
                >
                  Start Cooking
                </button>
              ) : (
                <button
                  onClick={() => updateStatus(order.id, 'READY')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <CheckCircle size={18} /> Ready to Serve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenKDS;