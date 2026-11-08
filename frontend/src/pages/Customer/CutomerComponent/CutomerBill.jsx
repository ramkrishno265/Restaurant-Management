import React, { useMemo, useState } from 'react';
import { Receipt, X, Utensils } from 'lucide-react';

/**
 * CustomerBillModal
 * Props:
 *   orders: Array  -> ekadhik order thakle shobgulor bill ekshathe merge hobe
 *
 * Kono order na thakle kichui dekhabe na.
 */
const CustomerBillModal = ({ orders = [] }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Shob order-er item ek jaygay merge kore bill banano
    const { items, total } = useMemo(() => {
        const list = Array.isArray(orders) ? orders.filter(Boolean) : [];
        const map = new Map();

        list.forEach((order) => {
            (order.items || []).forEach((item) => {
                const price = Number(item.unitPrice ?? item.price ?? 0);
                const key = `${item.menuItemId || item.id || item.name}_${price}`;
                const qty = Number(item.quantity || 0);

                if (map.has(key)) {
                    map.get(key).quantity += qty;
                } else {
                    map.set(key, { key, name: item.name, price, quantity: qty });
                }
            });
        });

        const merged = Array.from(map.values());
        const sum = merged.reduce((acc, i) => acc + i.price * i.quantity, 0);
        return { items: merged, total: sum };
    }, [orders]);

    // Order ba item na thakle kichu dekhabo na
    if (!orders || orders.length === 0 || items.length === 0) return null;

    const totalQty = items.reduce((a, i) => a + i.quantity, 0);
    const orderIds = orders.map((o) => `#${o.id}`).join(', ');
    const allServed = orders.every((o) => o.status === 'SERVED');

    return (
        <>
            {/* Bill summary card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-xl flex items-center justify-center shrink-0">
                        <Receipt size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white">Apnar Bill</p>
                        <p className="text-xs text-slate-400 truncate">
                            {totalQty} ti item • <span className="text-orange-400 font-bold">৳{total}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0"
                >
                    Bill Dekhun
                </button>
            </div>

            {/* Bill modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Receipt size={18} className="text-orange-500" /> Bill Biboroni
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Order {orderIds} •{' '}
                                    <span className="text-orange-400 font-bold">
                                        {allServed ? 'Served' : 'Cholchhe'}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {items.map((item) => (
                                <div
                                    key={item.key}
                                    className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex justify-between items-center"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Utensils size={14} className="text-slate-500 shrink-0" />
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-100 text-sm truncate">{item.name}</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                ৳{item.price} × {item.quantity}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-extrabold text-orange-400 text-sm">
                                        ৳{item.price * item.quantity}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-400">Mot Bill:</span>
                            <span className="text-orange-400 text-xl font-black">৳{total}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 text-center">
                            Payment korte waiter-ke daken.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default CustomerBillModal;