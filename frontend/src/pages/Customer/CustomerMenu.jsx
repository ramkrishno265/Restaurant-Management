import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import { ShoppingBag, Bell, Utensils, User, Phone, Sparkles, Plus, Minus } from 'lucide-react';

const CustomerMenu = () => {
    const { tableId } = useParams();
    const socket = useSocket();

    // Customer Info State
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
    const [showCustomerModal, setShowCustomerModal] = useState(true);

    // Menu & Cart State
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderStatus, setOrderStatus] = useState(null);

    useEffect(() => {
        // 1. Storage Check
        const savedCustomer = localStorage.getItem(`customer_table_${tableId}`);
        if (savedCustomer) {
            setCustomerInfo(JSON.parse(savedCustomer));
            setShowCustomerModal(false);
        } else {
            setShowCustomerModal(true);
        }

        // 2. Fetch Menu
        API.get('/menu')
            .then((res) => setCategories(res.data))
            .catch((err) => console.error(err));

        // 3. Live Socket Connection & Clear Handler
        if (socket && tableId) {
            // Join multiple room pattern for safety
            socket.emit('join_table', `table_${tableId}`);
            socket.emit('join_table', tableId);

            // Listen for clear table event from Admin
            const handleTableCleared = () => {
                // Direct LocalStorage key removal
                localStorage.removeItem(`customer_table_${tableId}`);

                // Reset States
                setCustomerInfo({ name: '', phone: '' });
                setCart([]);
                setIsCartOpen(false);
                setOrderStatus(null);
                setShowCustomerModal(true);
            };

            socket.on('table_cleared', handleTableCleared);

            return () => {
                socket.off('table_cleared', handleTableCleared);
            };
        }
    }, [socket, tableId]);

    // Save Customer Info Handler
    const handleSaveCustomerInfo = async (e) => {
        e.preventDefault();
        if (!customerInfo.name || !customerInfo.phone) {
            alert('আপনার নাম এবং ফোন নম্বর লিখুন');
            return;
        }

        try {
            const res = await API.post(`/tables/${tableId}/occupy`, {
                name: customerInfo.name,
                phone: customerInfo.phone,
            });

            if (res.data.success) {
                localStorage.setItem(`customer_table_${tableId}`, JSON.stringify(customerInfo));
                setShowCustomerModal(false);
            }
        } catch (err) {
            if (err.response && err.response.status === 403) {
                alert('❌ এই টেবিলটিতে এখন অন্য কাস্টমার আছেন! দয়া করে অন্য টেবিলে বসুন অথবা ওয়েটার ডাকুন।');
            } else {
                alert('টেবিল সেটিংসে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
            }
        }
    };

    // Cart Add/Remove Logic
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

    // Service Request Handler
    const sendServiceRequest = async (type) => {
        try {
            await API.post('/service-requests', { tableId, type });
            alert('ওয়েটারকে বার্তা পাঠানো হয়েছে!');
        } catch (err) {
            alert('অনুরোধ পাঠানো সম্ভব হয়নি');
        }
    };

    // Order Placement
    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;

        const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const orderData = {
            tableId,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            items: cart.map((i) => ({ menuItemId: i.id, quantity: i.quantity, unitPrice: i.price })),
            totalAmount,
        };

        try {
            await API.post('/orders', orderData);
            setCart([]);
            setIsCartOpen(false);
            setOrderStatus('PENDING');
            alert('অর্ডার সফলভাবে সম্পূর্ণ হয়েছে!');
        } catch (err) {
            alert('অর্ডার করতে সমস্যা হচ্ছে');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 font-sans select-none antialiased">

            {/* 1. MOBILE-FRIENDLY CUSTOMER INFO POPUP MODAL */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-slate-900 border-t sm:border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom duration-300">

                        {/* Top Indicator Handle bar for Mobile */}
                        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-5 sm:hidden"></div>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-600/10">
                                <Utensils size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-wide">রেস্তোরাঁয় স্বাগতম!</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                টেবিল নম্বর <span className="text-orange-400 font-bold">#{tableId}</span> • খাবার অর্ডার করতে নাম ও মোবাইল নম্বর দিন
                            </p>
                        </div>

                        <form onSubmit={handleSaveCustomerInfo} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <User size={14} className="text-orange-400" /> আপনার নাম
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="যেমন: তানভীর আহমেদ"
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <Phone size={14} className="text-orange-400" /> মোবাইল নম্বর
                                </label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="017XXXXXXXX"
                                    value={customerInfo.phone}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-orange-600 active:bg-orange-700 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 mt-2 text-base"
                            >
                                <Sparkles size={20} /> মেনু দেখুন
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. TOP HEADER NAVBAR */}
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3.5 sticky top-0 z-30 backdrop-blur-md flex justify-between items-center">
                <div>
                    <h1 className="text-base font-bold text-white tracking-wide">ডিজিটাল মেনু</h1>
                    <p className="text-xs text-orange-400 font-semibold truncate max-w-[180px]">
                        টেবিল #{tableId} {customerInfo.name && `• ${customerInfo.name}`}
                    </p>
                </div>

                <button
                    onClick={() => sendServiceRequest('CALL_WAITER')}
                    className="bg-slate-800 border border-slate-700 active:scale-95 px-3 py-2 rounded-xl text-orange-400 hover:bg-slate-700 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
                >
                    <Bell size={16} /> ওয়েটার ডাকুন
                </button>
            </div>

            {/* 3. ORDER STATUS BANNER */}
            {orderStatus && (
                <div className="mx-4 mt-4 bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between text-amber-400">
                    <div>
                        <p className="text-xs font-medium text-slate-400">অর্ডারের বর্তমান অবস্থা</p>
                        <p className="text-sm font-extrabold tracking-wider uppercase mt-0.5">{orderStatus}</p>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                </div>
            )}

            {/* 4. MENU ITEMS LIST */}
            <div className="p-4 max-w-lg mx-auto space-y-6">
                {categories.map((cat) => (
                    <div key={cat.id} className="space-y-3">
                        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2">
                            {cat.name}
                        </h2>

                        <div className="grid grid-cols-1 gap-3.5">
                            {cat.menuItems?.map((item) => {
                                const qty = getItemQuantity(item.id);

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex justify-between items-center shadow-md active:border-slate-700 transition"
                                    >
                                        <div className="pr-3 flex-1">
                                            <h3 className="font-bold text-slate-100 text-sm">{item.name}</h3>
                                            <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{item.description}</p>
                                            <p className="text-orange-400 font-black text-base mt-2">৳{item.price}</p>
                                        </div>

                                        {/* Add / Quantity Button */}
                                        <div className="shrink-0">
                                            {qty === 0 ? (
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="bg-orange-600 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-orange-600/20"
                                                >
                                                    + যোগ করুন
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
                ))}
            </div>

            {/* 5. FLOATING BOTTOM CART BUTTON */}
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
                            <span className="text-sm font-bold">{cart.reduce((a, c) => a + c.quantity, 0)} টি আইটেম</span>
                        </div>
                        <span className="text-sm font-black">অর্ডার নিশ্চিত করুন (৳{cart.reduce((a, c) => a + c.price * c.quantity, 0)})</span>
                    </button>
                </div>
            )}

            {/* 6. MOBILE BOTTOM SHEET CART MODAL */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center z-50">
                    <div className="bg-slate-900 border-t border-slate-800 w-full max-w-md rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">

                        {/* Top Indicator Bar */}
                        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-2"></div>

                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h2 className="text-base font-bold text-white">আপনার কার্ট বিবরণী</h2>
                            <button onClick={() => setIsCartOpen(false)} className="text-slate-400 font-bold text-xl px-2 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-3">
                            {cart.map((item) => (
                                <div key={item.id} className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                                    <div>
                                        <p className="font-semibold text-sm text-slate-200">{item.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">৳{item.price} x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="font-bold text-orange-400 text-sm">৳{item.price * item.quantity}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handlePlaceOrder}
                                className="w-full bg-orange-600 active:scale-95 text-white py-4 rounded-2xl font-bold text-base shadow-lg transition"
                            >
                                অর্ডার নিশ্চিত করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CustomerMenu;