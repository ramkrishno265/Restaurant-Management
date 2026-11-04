import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import API from '../../services/api';

const AdminLayout = () => {
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await API.get('/menu');
      // Category array flattened to menu items array
      let itemsList = [];
      if (Array.isArray(res.data)) {
        res.data.forEach((cat) => {
          if (cat.menuItems) {
            cat.menuItems.forEach((item) => {
              itemsList.push({ ...item, categoryName: cat.name });
            });
          } else {
            itemsList.push(cat);
          }
        });
      }
      setMenuItems(itemsList);
    } catch (err) {
      console.error('Fetch Menu Error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Admin Sidebar & Header */}
      <main className="flex-1 p-6">
        <Outlet context={{ menuItems, setMenuItems, fetchMenuItems }} />
      </main>
    </div>
  );
};

export default AdminLayout;