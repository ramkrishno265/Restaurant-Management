import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingBag, 
  Utensils, 
  Table, 
  Bell, 
  LogOut, 
  ChefHat,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ pendingOrdersCount = 0, requestsCount = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      path: '/admin/orders',
      label: 'Live Orders',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      path: '/admin/menu',
      label: 'Menu Control',
      icon: Utensils,
    },
    {
      path: '/admin/requests',
      label: 'Service Requests',
      icon: Bell,
      badge: requestsCount > 0 ? requestsCount : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
    {
      path: '/admin/tables',
      label: 'Table Management',
      icon: Table,
    },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="md:hidden bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg text-white">
            <ChefHat size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">FoodieResto</h2>
            <p className="text-[10px] text-orange-400 font-medium">Admin Panel</p>
          </div>
        </div>
        
        <button
          onClick={toggleSidebar}
          className="text-slate-300 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Backdrop / Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between min-h-screen h-screen select-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header / Logo */}
        <div>
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 p-2.5 rounded-xl text-white shadow-lg shadow-orange-600/30">
                <ChefHat size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide leading-tight">FoodieResto</h2>
                <p className="text-xs text-orange-400 font-medium">Admin & Kitchen Panel</p>
              </div>
            </div>

            {/* Close button inside sidebar on mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <p className="px-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              MANAGEMENT
            </p>

            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)} // Mobile-এ মেনুতে ক্লিক করলে সাইডবার বন্ধ হবে
                  className={({ isActive }) =>
                    `w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight size={16} className="text-white/80" />}
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Section */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-400 text-sm">
                AD
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Manager</p>
                <p className="text-[11px] text-slate-500">Admin Privileges</p>
              </div>
            </div>
            <button 
              title="Logout" 
              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;