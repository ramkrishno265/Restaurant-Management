import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import { Clock, DollarSign, Utensils } from 'lucide-react';

const AdminDashboard = () => {
  const socket = useSocket();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  useEffect(() => {
    API.get('/orders').then((res) => setOrders(res.data)).catch(console.error);
    API.get('/menu').then((res) => {
      const allItems = res.data.flatMap((cat) => cat.menuItems || []);
      setMenuItems(allItems);
    }).catch(console.error);

    if (socket) {
      socket.emit('join_dashboard', 'admin');
      socket.on('new_order', (newOrder) => setOrders((prev) => [newOrder, ...prev]));
      socket.on('order_status_updated', (updatedOrder) => {
        setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      });
      socket.on('new_service_request', (req) => setServiceRequests((prev) => [req, ...prev]));
    }
  }, [socket]);

  const totalRevenue = orders.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;

  // Title generation from path name
  const currentPath = location.pathname.split('/')[2] || 'orders';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* 1. SIDEBAR */}
      <Sidebar 
        pendingOrdersCount={pendingOrders}
        requestsCount={serviceRequests.length}
      />

      {/* 2. MAIN LAYOUT AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-slate-950/70 border-b border-slate-800 px-4 sm:px-6 md:px-8 py-4 sticky top-0 z-20 backdrop-blur-md flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white capitalize">{currentPath} Overview</h1>
            <p className="text-[11px] sm:text-xs text-slate-400">Real-time restaurant control panel</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">System Live</span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {/* STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">৳{totalRevenue}</h3>
              </div>
              <div className="bg-emerald-500/10 p-2.5 sm:p-3 rounded-xl border border-emerald-500/20 text-emerald-400">
                <DollarSign size={22} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Orders</p>
                <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{pendingOrders}</h3>
              </div>
              <div className="bg-amber-500/10 p-2.5 sm:p-3 rounded-xl border border-amber-500/20 text-amber-400">
                <Clock size={22} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between sm:col-span-2 md:col-span-1">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Items</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-400 mt-1">
                  {menuItems.filter((i) => i.isAvailable).length} / {menuItems.length}
                </h3>
              </div>
              <div className="bg-blue-500/10 p-2.5 sm:p-3 rounded-xl border border-blue-500/20 text-blue-400">
                <Utensils size={22} className="sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>

          {/* DYNAMIC PAGE RENDER BASED ON ROUTE */}
          <Outlet context={{ orders, setOrders, menuItems, setMenuItems, serviceRequests, setServiceRequests }} />
        </main>
      </div>

    </div>
  );
};

export default AdminDashboard;