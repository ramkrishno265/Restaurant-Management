import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminMenu from './pages/admin/AdminMenu';
import AdminRequests from './pages/admin/AdminRequests';
import AdminTables from './pages/admin/AdminTables';



// Customer Page

import CustomerDashboard from './pages/Customer/CustomerDashboard';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          {/* ১. হোমপেজে ঢুকলে টেবিলে রিডাইরেক্ট হবে */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* ২. টেবিলে QR কোড স্ক্যান করে আসার রাউট (এটি মিসিং ছিল) */}
          <Route path="/table/:tableId" element={<CustomerDashboard />} />

          {/* ৩. সাধারণ কাস্টমার মেনু রাউট */}
          
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />

          {/* ৪. কিচেন ডিসপ্লে (KDS) রাউট */}
         

          {/* ৫. অ্যাডমিন নেস্টেড রাউটস */}
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="tables" element={<AdminTables />} />
          </Route>
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;