import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import CustomerLoginModal from '../../pages/Customer/customerLogin';
import CustomerMenuBar from '../../components/CustomerMenuBar';
import { 
  ShoppingBag, 
  Utensils, 
  Phone, 
  Plus, 
  Minus, 
  Clock, 
  XCircle,
  Search,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const CustomerDashboard = () => {
  const { tableId } = useParams();
  const socket = useSocket();

  // State Management
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });

  // Menu, Filter & Cart State
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Order Tracking State
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    // 1. Storage Check
    const savedCustomer = localStorage.getItem(`customer_table_${tableId}`);
    if (savedCustomer) {
      setCustomerInfo(JSON.parse(savedCustomer));
      setShowLoginModal(false);
    } else {
      setShowLoginModal(true);
    }

    // 2. Fetch Menu & Filter Available Items Only
    API.get('/menu')
      .then((res) => {
        let categoryData = [];
        if (Array.isArray(res.data)) {
          categoryData = res.data.map((cat) => ({
            ...cat,
            menuItems: cat.menuItems?.filter((item) => item.isAvailable !== false) || []
          })).filter((cat) => cat.menuItems.length > 0);
        }
        setCategories(categoryData);
      })
      .catch((err) => console.error('Fetch Menu Error:', err));

    // 3. Socket Real-Time Listeners
    if (socket && tableId) {
      const roomName = `table_${tableId}`;
      socket.emit('join_table', roomName);

      // Listen for Live Order Status Updates
      socket.on('order_status_updated', (data) => {
        if (String(data.tableId) === String(tableId)) {
          setActiveOrder((prev) => (prev ? { ...prev, status: data.status } : null));
        }
      });

      // Listen for Admin Clear Table -> Live Auto Logout
      const handleTableCleared = () => {
        localStorage.removeItem(`customer_table_${tableId}`);
        setCustomerInfo({ name: '', phone: '' });
        setCart([]);
        setIsCartOpen(false);
        setActiveOrder(null);
        setShowLoginModal(true);
        alert('⚠️ Apnar table session-ti Admin dwara clear kora hoyeche. Dhonnobad!');
      };

      socket.on('table_cleared', handleTableCleared);

      return () => {
        socket.off('order_status_updated');
        socket.off('table_cleared', handleTableCleared);
      };
    }
  }, [socket, tableId]);

  // Login Success Callback
  const handleLoginSuccess = (info) => {
    setCustomerInfo(info);
    setShowLoginModal(false);
  };

  // Service Request Handler (Waiter, Water, Tissue)
  const handleServiceRequest = async (type) => {
    try {
      await API.post('/service-requests', { tableId, type });
      const messages = {
        CALL_WAITER: 'Waiter-ke barta pathano hoyeche!',
        WATER: 'Pani-r botoler request pathano hoyeche!',
        TISSUE: 'Tissue-er request pathano hoyeche!',
      };
      alert(messages[type] || 'Request pathano hoyeche!');
    } catch (err) {
      alert('Request pathano shombhob hoyni.');
    }
  };

  // Cart Management
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === item.id);
      if (existing) {
        return prevCart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === itemId);
      if (existing.quantity === 1) {
        return prevCart.filter((i) => i.id !== itemId);
      }
      return prevCart.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const getItemQuantity = (itemId) => {
    const item = cart.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  };

  // Place Order Logic
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const orderData = {
      tableId,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      items: cart.map((i) => ({ menuItemId: i.id, name: i.name, quantity: i.quantity, unitPrice: i.price })),
      totalAmount,
    };

    try {
      const res = await API.post('/orders', orderData);
      setActiveOrder({
        id: res.data.id || Date.now(),
        status: 'PENDING',
        items: [...cart],
        totalAmount
      });
      setCart([]);
      setIsCartOpen(false);
      alert('✅ Apnar order-ti rannaghore pathano hoyeche!');
    } catch (err) {
      alert('Order submit korte shomossha hochhe.');
    }
  };

  // Cancel Order Logic
  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    if (activeOrder.status !== 'PENDING') {
      alert('❌ Kitchen-e khabar toiri shuru hoye geche! Akn r order cancel kora shombhob noy.');
      return;
    }

    if (!window.confirm('Apni ki nishchit je order-ti batil korte chan?')) return;

    try {
      await API.patch(`/orders/${activeOrder.id}/cancel`);
      setActiveOrder(null);
      alert('Order-ti batil kora hoyeche.');
    } catch (err) {
      setActiveOrder(null);
    }
  };

  const categoryNames = ['ALL', ...categories.map((c) => c.name)];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans select-none flex flex-col antialiased pb-28">

      {/* 1. CUSTOMER LOGIN POPUP MODAL */}
      <CustomerLoginModal
        tableId={tableId}
        isOpen={showLoginModal}
        onSuccess={handleLoginSuccess}
      />

      {/* 2. TOP NAVBAR & SIDEBAR COMPONENT */}
      <CustomerMenuBar
        tableId={tableId}
        customerInfo={customerInfo}
        onServiceRequest={handleServiceRequest}
      />

      {/* MAIN CONTAINER */}
      <main className="p-4 max-w-lg mx-auto w-full space-y-5 flex-1">

        {/* 3. WELCOME BANNER WITH CUSTOMER DETAILS */}
        <div className="bg-gradient-to-r from-orange-600/20 via-slate-800 to-slate-900 border border-orange-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <Sparkles size={12} /> Restora-y Swagatom!
              </span>
              <h2 className="text-lg font-extrabold text-white mt-2">
                Hello, {customerInfo.name || 'Guest Customer'} 👋
              </h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Phone size={12} className="text-orange-400" />
                <span>{customerInfo.phone || '01XXXXXXXXX'}</span>
                <span>•</span>
                <span className="text-orange-400 font-bold">Table #{tableId}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
              <Utensils size={24} />
            </div>
          </div>
        </div>

        {/* 4. ACTIVE ORDER TRACKER BANNER */}
        {activeOrder && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="text-orange-400 animate-pulse" size={20} />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Status</p>
                  <p className="text-sm font-black text-orange-400 uppercase">{activeOrder.status}</p>
                </div>
              </div>

              {activeOrder.status === 'PENDING' ? (
                <button
                  onClick={handleCancelOrder}
                  className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-rose-500/20 active:scale-95 transition"
                >
                  <XCircle size={14} /> Batil Korun
                </button>
              ) : (
                <span className="text-[10px] font-bold bg-slate-950 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-800">
                  🔒 Locked
                </span>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-xs text-slate-400">
              <span>Mot Item: <strong className="text-white">{activeOrder.items?.length || 0} ti</strong></span>
              <span>Total Bill: <strong className="text-orange-400 font-extrabold text-sm">৳{activeOrder.totalAmount}</strong></span>
            </div>
          </div>
        )}

        {/* 5. SEARCH & CATEGORY FILTER */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Khabarer naam diye khujun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryNames.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                  selectedCategory === cat
                    ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-600/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 6. MENU ITEMS LIST */}
        <div className="space-y-6">
          {categories
            .filter((cat) => selectedCategory === 'ALL' || cat.name === selectedCategory)
            .map((cat) => {
              const filteredItems = cat.menuItems?.filter((i) =>
                i.name.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (!filteredItems || filteredItems.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-3">
                  <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                    {cat.name}
                  </h2>

                  <div className="grid grid-cols-1 gap-3.5">
                    {filteredItems.map((item) => {
                      const qty = getItemQuantity(item.id);

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex justify-between items-center shadow-md transition"
                        >
                          <div className="pr-3 flex-1">
                            <h3 className="font-bold text-slate-100 text-sm">{item.name}</h3>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                              {item.description || 'Kono biboron dewa hoyni.'}
                            </p>
                            <p className="text-orange-400 font-black text-base mt-2">৳{item.price}</p>
                          </div>

                          <div className="shrink-0">
                            {qty === 0 ? (
                              <button
                                onClick={() => addToCart(item)}
                                className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-orange-600/20"
                              >
                                + Jog Korun
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 p-1 rounded-xl">
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-7 h-7 bg-slate-700 text-white rounded-lg flex items-center justify-center font-bold"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-xs font-extrabold text-white px-1">{qty}</span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="w-7 h-7 bg-orange-600 text-white rounded-lg flex items-center justify-center font-bold"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </main>

      {/* 7. FLOATING BOTTOM CART BUTTON */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-orange-600 active:scale-[0.98] text-white p-4 rounded-2xl font-bold shadow-2xl shadow-orange-600/40 flex justify-between items-center transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShoppingBag size={20} />
              </div>
              <span className="text-sm font-bold">{cart.reduce((a, c) => a + c.quantity, 0)} ti Item</span>
            </div>
            <span className="text-sm font-black">Cart Dekhun (৳{cart.reduce((a, c) => a + c.price * c.quantity, 0)})</span>
          </button>
        </div>
      )}

      {/* 8. BOTTOM SHEET CART MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-slate-900 border-t border-slate-800 w-full max-w-md rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-2"></div>

            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Apnar Cart Biboroni</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 font-bold text-xl px-2 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">৳{item.price} x {item.quantity}</p>
                  </div>
                  <p className="font-bold text-orange-400 text-sm">৳{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handlePlaceOrder}
                className="w-full bg-orange-600 active:scale-95 text-white py-4 rounded-2xl font-bold text-base shadow-lg transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Order Nishchit Korun
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerDashboard;