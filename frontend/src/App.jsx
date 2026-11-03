import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import CustomerMenu from './pages/CustomerMenu';
import KitchenKDS from './pages/KitchenKDS';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          {/* Default URL automatically redirects to Table 1 for testing */}
          <Route path="/" element={<Navigate to="/table/1" replace />} />

          {/* Customer View (Accessed via QR Code) */}
          <Route path="/table/:tableId" element={<CustomerMenu />} />

          {/* Kitchen Display View (KDS) */}
          <Route path="/kitchen" element={<KitchenKDS />} />

          {/* Admin & Waiter Dashboard */}
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;