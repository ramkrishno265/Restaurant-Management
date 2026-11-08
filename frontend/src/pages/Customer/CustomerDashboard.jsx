import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import CustomerLoginModal from '../Customer/customerLogin';
import CustomerMenuBar from '../../components/CustomerMenuBar';
import OrderTrackerBanner from './CutomerComponent/OrderTrackerBanner';
import CustomerBillModal from './CutomerComponent/CutomerBill';
import {
    ShoppingBag,
    Utensils,
    Phone,
    Plus,
    Minus,
    Clock,
    Search,
    CheckCircle2,
    Sparkles,
    X
} from 'lucide-react';

// ✅ FIX 2: API response e { success, data: [...] } ba shudhu [...] - duto shapei kaj korbe
const normalizeOrders = (resData) => {
    const raw = resData?.data ?? resData;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return [raw];
    return [];
};

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

    // Active Orders & Loading State
    const [activeOrders, setActiveOrders] = useState([]);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);

    // ✅ FIX 1: SERVED hoye gele order activeOrders theke soriye jay,
    // tai bill-er jonno shesh SERVED order alada rakha hocche
    const [billOrder, setBillOrder] = useState(null);

    // ⚡ Menu fetch (alada function, jate socket event e abar call kora jay)
    const fetchMenu = useCallback(() => {
        API.get('/menu')
            .then((res) => {
                const rawData = res.data?.data || res.data || [];
                if (Array.isArray(rawData)) {
                    const categoryData = rawData
                        .map((cat) => ({
                            ...cat,
                            menuItems: cat.menuItems?.filter((item) => item.isAvailable !== false) || []
                        }))
                        .filter((cat) => cat.menuItems.length > 0);

                    setCategories(categoryData);

                    // ⚡ Cart e thaka kono item jodi ar available na thake, cart theke soriye dao
                    const availableIds = new Set(
                        categoryData.flatMap((cat) => cat.menuItems.map((i) => String(i.id)))
                    );
                    setCart((prev) => {
                        const filtered = prev.filter((i) => availableIds.has(String(i.id)));
                        return filtered.length === prev.length ? prev : filtered;
                    });
                }
            })
            .catch((err) => console.error('Fetch Menu Error:', err));
    }, []);

    useEffect(() => {
        // 1. Storage Check Customer Info
        const savedCustomer = localStorage.getItem(`customer_table_${tableId}`);
        if (savedCustomer) {
            try {
                setCustomerInfo(JSON.parse(savedCustomer));
                setShowLoginModal(false);
            } catch (e) {
                setShowLoginModal(true);
            }
        } else {
            setShowLoginModal(true);
        }

        // 2. Instant Local Cache Load
        const cachedOrders = localStorage.getItem(`cached_orders_${tableId}`);
        if (cachedOrders) {
            try {
                const parsed = JSON.parse(cachedOrders);
                setActiveOrders(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                console.error('Cache parsing error', e);
            }
        }

        // ✅ Shesh SERVED bill cache load (page refresh dileo bill thakbe)
        const cachedBill = localStorage.getItem(`cached_bill_${tableId}`);
        if (cachedBill) {
            try {
                setBillOrder(JSON.parse(cachedBill));
            } catch (e) {
                console.error('Bill cache parsing error', e);
            }
        }

        // 3. Fetch Menu Items
        fetchMenu();

        // 4. Initial Active Orders Fetch
        if (tableId) {
            API.get(`/orders/active/${tableId}`)
                .then((res) => {
                    const ordersList = normalizeOrders(res.data); // ✅ FIX 2
                    setActiveOrders(ordersList);
                    localStorage.setItem(`cached_orders_${tableId}`, JSON.stringify(ordersList));
                })
                .catch((err) => console.error('Fetch Active Orders Error:', err));
        }

        // 5. Socket Listener Configuration
        if (socket && tableId) {
            socket.emit('join_table', `table_${String(tableId)}`);

            const handleStatusUpdate = (data) => {
                console.log('⚡ Live Socket Data Received:', data);

                const incomingTable = String(data.tableNumber || data.tableId || data.table?.tableNumber || data.table?.id);
                const currentTable = String(tableId);

                if (incomingTable === currentTable) {
                    setActiveOrders((prev) => {
                        const targetId = data.orderId || data.id;
                        const exists = prev.some((o) => String(o.id) === String(targetId));

                        let updatedList;
                        if (data.status === 'SERVED' || data.status === 'CANCELLED') {
                            // ✅ FIX 1: SERVED hole muchhe fela-r age bill-er jonno save kore rakho
                            if (data.status === 'SERVED') {
                                const served = prev.find((o) => String(o.id) === String(targetId));
                                if (served) {
                                    const billData = { ...served, status: 'SERVED' };
                                    setBillOrder(billData);
                                    localStorage.setItem(`cached_bill_${tableId}`, JSON.stringify(billData));
                                }
                            }
                            updatedList = prev.filter((o) => String(o.id) !== String(targetId));
                        } else if (exists) {
                            updatedList = prev.map((o) =>
                                String(o.id) === String(targetId)
                                    ? {
                                        ...o,
                                        status: data.status,
                                        cookingStartedAt: data.cookingStartedAt || (data.status === 'COOKING' ? new Date().toISOString() : o.cookingStartedAt),
                                        estimatedMinutes: data.estimatedMinutes || o.estimatedMinutes
                                    }
                                    : o
                            );
                        } else {
                            updatedList = [...prev];
                        }

                        localStorage.setItem(`cached_orders_${tableId}`, JSON.stringify(updatedList));
                        return updatedList;
                    });
                }
            };

            const handleNewOrder = (newOrder) => {
                const incomingTable = String(newOrder.table?.tableNumber || newOrder.tableId);
                if (incomingTable === String(tableId)) {
                    setActiveOrders((prev) => {
                        const exists = prev.some((o) => String(o.id) === String(newOrder.id));
                        const updated = exists ? prev.map((o) => String(o.id) === String(newOrder.id) ? newOrder : o) : [newOrder, ...prev];
                        localStorage.setItem(`cached_orders_${tableId}`, JSON.stringify(updated));
                        return updated;
                    });
                }
            };

            const handleTableCleared = () => {
                localStorage.removeItem(`customer_table_${tableId}`);
                localStorage.removeItem(`cached_orders_${tableId}`);
                localStorage.removeItem(`cached_bill_${tableId}`); // ✅ bill cache o clear
                setCustomerInfo({ name: '', phone: '' });
                setCart([]);
                setIsCartOpen(false);
                setActiveOrders([]);
                setBillOrder(null); // ✅
                setShowLoginModal(true);
                alert('⚠️ Apnar table session-ti Admin dwara clear kora hoyeche!');
            };

            // ⚡ Admin menu change korle live menu refresh
            const handleMenuUpdated = (data) => {
                console.log('⚡ menu_updated received:', data);
                if (data?.id && data.isAvailable === false) {
                    setCart((prev) => prev.filter((i) => String(i.id) !== String(data.id)));
                }
                fetchMenu();
            };

            socket.off('order_status_updated', handleStatusUpdate);
            socket.off('new_order', handleNewOrder);
            socket.off('table_cleared', handleTableCleared);
            socket.off('menu_updated', handleMenuUpdated);

            socket.on('order_status_updated', handleStatusUpdate);
            socket.on('new_order', handleNewOrder);
            socket.on('table_cleared', handleTableCleared);
            socket.on('menu_updated', handleMenuUpdated);

            return () => {
                socket.off('order_status_updated', handleStatusUpdate);
                socket.off('new_order', handleNewOrder);
                socket.off('table_cleared', handleTableCleared);
                socket.off('menu_updated', handleMenuUpdated);
            };
        }
    }, [socket, tableId, fetchMenu]);

    // Login Success Callback
    const handleLoginSuccess = (info) => {
        setCustomerInfo(info);
        setShowLoginModal(false);
    };

    // Service Request Handler
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
            if (existing && existing.quantity === 1) {
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

    // Cart khali hoye gele cart modal bondho kore dao
    useEffect(() => {
        if (cart.length === 0 && isCartOpen) setIsCartOpen(false);
    }, [cart, isCartOpen]);

    // Place / Update Order Logic
    const handlePlaceOrder = async () => {
        if (cart.length === 0 || isSubmitting) return;

        setIsSubmitting(true);

        const pendingOrder = activeOrders.find((o) => o.status === 'PENDING');

        let updatedItemsList = [];
        if (pendingOrder) {
            const existingItems = pendingOrder.items || [];
            updatedItemsList = [...existingItems];

            cart.forEach((cartItem) => {
                const foundIndex = updatedItemsList.findIndex(
                    (i) => (i.menuItemId || i.id) === cartItem.id
                );
                if (foundIndex > -1) {
                    updatedItemsList[foundIndex] = {
                        ...updatedItemsList[foundIndex],
                        quantity: updatedItemsList[foundIndex].quantity + cartItem.quantity
                    };
                } else {
                    updatedItemsList.push({
                        menuItemId: cartItem.id,
                        name: cartItem.name,
                        quantity: cartItem.quantity,
                        unitPrice: cartItem.price,
                        price: cartItem.price
                    });
                }
            });
        } else {
            updatedItemsList = cart.map((i) => ({
                menuItemId: i.id,
                name: i.name,
                quantity: i.quantity,
                unitPrice: i.price,
                price: i.price
            }));
        }

        const totalAmount = updatedItemsList.reduce(
            (acc, item) => acc + (item.unitPrice || item.price) * item.quantity,
            0
        );

        const orderData = {
            tableId,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            items: updatedItemsList,
            totalAmount,
        };

        try {
            if (pendingOrder) {
                await API.patch(`/orders/${pendingOrder.id}/items`, orderData);
            } else {
                await API.post('/orders', orderData);
            }

            // Refresh Active Orders
            const updatedRes = await API.get(`/orders/active/${tableId}`);
            const updatedData = normalizeOrders(updatedRes.data); // ✅ FIX 2

            setActiveOrders(updatedData);
            localStorage.setItem(`cached_orders_${tableId}`, JSON.stringify(updatedData));

            setCart([]);
            setIsCartOpen(false);
            alert('✅ Order safollobhabe submit hoyeche!');
        } catch (err) {
            console.error('Order Submit Error:', err);
            alert('Order update/submit korte shomossha hochhe.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ❌ Order Cancel (shudhu PENDING thakle)
    const handleCancelOrder = async (order) => {
        if (!order || cancellingId) return;

        if (order.status !== 'PENDING') {
            alert('Ranna shuru hoye geche, ekhon cancel kora jabe na. Waiter-ke bolun.');
            return;
        }

        if (!window.confirm(`Order #${order.id} ki shotti cancel korben?`)) return;

        setCancellingId(order.id);
        try {
            await API.patch(`/orders/${order.id}/cancel`);

            setActiveOrders((prev) => {
                const updated = prev.filter((o) => String(o.id) !== String(order.id));
                localStorage.setItem(`cached_orders_${tableId}`, JSON.stringify(updated));
                return updated;
            });
            setSelectedOrderDetails(null);
            alert('Order cancel kora hoyeche.');
        } catch (err) {
            console.error('Cancel Order Error:', err);
            alert(err.response?.data?.message || 'Order cancel korte shomossha hochhe.');
        } finally {
            setCancellingId(null);
        }
    };

    // Details modal khola thakle live status dekhar jonno
    const detailsLive = selectedOrderDetails
        ? activeOrders.find((o) => String(o.id) === String(selectedOrderDetails.id)) || selectedOrderDetails
        : null;

    const categoryNames = ['ALL', ...categories.map((c) => c.name)];

    // ⚡ Selected category jodi menu theke chole jay, ALL e fire jao
    useEffect(() => {
        if (selectedCategory !== 'ALL' && !categories.some((c) => c.name === selectedCategory)) {
            setSelectedCategory('ALL');
        }
    }, [categories, selectedCategory]);

    // ✅ Bill-e kon order jabe: cholchhe emon order thakle seta, na thakle shesh SERVED order
    const billOrders = activeOrders.length > 0 ? activeOrders : (billOrder ? [billOrder] : []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans select-none flex flex-col antialiased pb-28">

            {/* 1. CUSTOMER LOGIN POPUP MODAL */}
            <CustomerLoginModal
                tableId={tableId}
                isOpen={showLoginModal}
                onSuccess={handleLoginSuccess}
            />

            {/* 2. TOP NAVBAR COMPONENT */}
            <CustomerMenuBar
                tableId={tableId}
                customerInfo={customerInfo}
                onServiceRequest={handleServiceRequest}
            />

            {/* MAIN CONTAINER */}
            <main className="p-4 max-w-lg mx-auto w-full space-y-5 flex-1">

                {/* 3. WELCOME BANNER */}
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

                {/* 4. CUSTOMER BILL MODAL */}
                <CustomerBillModal orders={billOrders} />

                {/* 4. ORDER TRACKER BANNER (Supports Multiple Active Orders Array) */}
                <OrderTrackerBanner
                    activeOrders={activeOrders}
                    onViewDetails={(order) => setSelectedOrderDetails(order)}
                />

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
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${selectedCategory === cat
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
                    {categories.length === 0 ? (
                        <p className="text-center py-12 text-slate-500 text-xs">Kono menu item pawa jayni.</p>
                    ) : (
                        categories
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
                                                        className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between gap-3.5 shadow-md hover:border-slate-700 transition"
                                                    >
                                                        {/* Image */}
                                                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                                                            {item.imageUrl ? (
                                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950">
                                                                    <Utensils size={26} />
                                                                    <span className="text-[9px] mt-1 text-slate-500">Chobi Nei</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Item Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-slate-100 text-sm truncate">{item.name}</h3>
                                                            <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                                                                {item.description || 'Kono biboron dewa hoyni.'}
                                                            </p>
                                                            <p className="text-orange-400 font-black text-base mt-1.5">৳{item.price}</p>
                                                        </div>

                                                        {/* Add / Quantity Button */}
                                                        <div className="shrink-0">
                                                            {qty === 0 ? (
                                                                <button
                                                                    onClick={() => addToCart(item)}
                                                                    className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-orange-600/20"
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
                            })
                    )}
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
                                disabled={isSubmitting}
                                className="w-full bg-orange-600 disabled:bg-orange-800/80 active:scale-95 text-white py-4 rounded-2xl font-bold text-base shadow-lg transition flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <span className="inline-flex items-center gap-2 animate-pulse">
                                        <Clock className="animate-spin" size={18} /> Processing Order...
                                    </span>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} /> Order Nishchit Korun
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CustomerDashboard;