import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';
import { LayoutDashboard, Bell, Check } from 'lucide-react';

const AdminDashboard = () => {
  const socket = useSocket();
  const [orders, setOrders] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  useEffect(() => {
    // 1. Fetch Active Orders
    API.get('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err));

    // 2. Join Admin Room
    if (socket) {
      socket.emit('join_dashboard', 'admin');

      socket.on('new_order', (newOrder) => {
        setOrders((prev) => [newOrder, ...prev]);
      });

      socket.on('order_status_updated', (updatedOrder) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
        );
      });

      socket.on('new_service_request', (req) => {
        setServiceRequests((prev) => [req, ...prev]);
      });
    }
  }, [socket]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await API.patch(`/orders/${orderId}/status`, { status: newStatus });
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-orange-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>
      </div>

      {/* Service Requests Section */}
      {serviceRequests.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
          <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-3">
            <Bell size={20} /> Service Requests
          </h2>
          <div className="flex flex-wrap gap-3">
            {serviceRequests.map((req, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3">
                <span className="font-bold text-gray-800">Table #{req.table?.tableNumber || req.tableId}</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-semibold">
                  {req.type}
                </span>
                <button
                  onClick={() => setServiceRequests((prev) => prev.filter((_, i) => i !== idx))}
                  className="bg-green-100 text-green-700 p-1 rounded hover:bg-green-200"
                >
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Overview */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Active Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-500 text-sm">
                <th className="pb-3">Order ID</th>
                <th className="pb-3">Table</th>
                <th className="pb-3">Items</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b text-sm">
                  <td className="py-3 font-semibold">#{order.id}</td>
                  <td className="py-3">Table {order.table?.tableNumber || order.tableId}</td>
                  <td className="py-3">
                    {order.orderItems?.map((i) => `${i.menuItem?.name || 'Item'} (x${i.quantity})`).join(', ')}
                  </td>
                  <td className="py-3 font-bold text-orange-600">৳{order.totalAmount}</td>
                  <td className="py-3">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {order.status !== 'SERVED' && (
                      <button
                        onClick={() => updateStatus(order.id, 'SERVED')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700"
                      >
                        Mark Served
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;