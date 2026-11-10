import React, { useEffect, useRef, useState } from 'react';
import {
    Clock,
    ChefHat,
    BellRing,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronDown,
    Utensils,
    X
} from 'lucide-react';

/* ----------------------------- Config ----------------------------- */

const STEPS = [
    { key: 'PENDING', label: 'Grohon', Icon: Clock },
    { key: 'COOKING', label: 'Ranna', Icon: ChefHat },
    { key: 'READY', label: 'Ready', Icon: BellRing },
    { key: 'SERVED', label: 'Served', Icon: CheckCircle2 }
];

const STATUS_META = {
    PENDING: {
        label: 'Order Grohon Kora Hoyeche',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        Icon: Clock,
        iconClass: 'animate-pulse'
    },
    COOKING: {
        label: 'Rannagore Khabar Toiri Hochhe',
        color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
        Icon: ChefHat,
        iconClass: 'animate-bounce'
    },
    READY: {
        label: 'Khabar Toiri! Poribeshon Kora Hochhe',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        Icon: BellRing,
        iconClass: ''
    },
    SERVED: {
        label: 'Khabar Poribeshon Kora Hoyeche',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        Icon: CheckCircle2,
        iconClass: ''
    },
    CANCELLED: {
        label: 'Order Cancel Kora Hoyeche',
        color: 'text-red-400 bg-red-500/10 border-red-500/30',
        Icon: XCircle,
        iconClass: ''
    }
};

const FALLBACK_META = {
    label: 'Order Cholchhe',
    color: 'text-slate-400 bg-slate-800 border-slate-700',
    Icon: AlertCircle,
    iconClass: ''
};

const DEFAULT_ESTIMATED_MINUTES = 20;

/* ----------------------------- Helpers ----------------------------- */

const getItemPrice = (item) => Number(item?.unitPrice ?? item?.price ?? 0);

const calcOrderTotal = (order) => {
    if (order?.totalAmount !== undefined && order?.totalAmount !== null) {
        return Number(order.totalAmount) || 0;
    }
    return (order?.items || []).reduce(
        (sum, item) => sum + getItemPrice(item) * Number(item.quantity || 0),
        0
    );
};

const parseTime = (value) => {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
};

const formatClock = (ms) =>
    new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const formatCountdown = (remainingMs) => {
    const totalSecs = Math.max(0, Math.ceil(remainingMs / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatTimeAgo = (ms, now) => {
    if (!ms) return '';
    const mins = Math.floor((now - ms) / 60000);
    if (mins < 1) return 'ekhon-i';
    if (mins < 60) return `${mins} min age`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} ghonta age`;
};

// Cooking cholle prti second, na hole 30 second por por update
const useNow = (intervalMs) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
};

/* ----------------------------- Stepper ----------------------------- */

const OrderStepper = ({ status }) => {
    const currentIndex = STEPS.findIndex((s) => s.key === status);
    const isServed = status === 'SERVED';

    return (
        <div className="flex items-start" role="list" aria-label="Order progress">
            {STEPS.map((step, index) => {
                const done = currentIndex >= index;
                const active = currentIndex === index;
                const accent = isServed ? 'emerald' : 'orange';
                const { Icon } = step;

                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1.5 w-12 shrink-0" role="listitem">
                            <div
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${done
                                        ? accent === 'emerald'
                                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                                            : 'bg-orange-500/15 border-orange-500 text-orange-400'
                                        : 'bg-slate-900 border-slate-700 text-slate-600'
                                    } ${active && !isServed ? 'ring-4 ring-orange-500/20' : ''}`}
                            >
                                <Icon size={14} />
                            </div>
                            <span
                                className={`text-[10px] font-bold ${done ? (accent === 'emerald' ? 'text-emerald-400' : 'text-orange-400') : 'text-slate-600'
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>

                        {index < STEPS.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mt-4 rounded-full transition-colors duration-300 ${currentIndex > index
                                        ? isServed
                                            ? 'bg-emerald-500'
                                            : 'bg-orange-500'
                                        : 'bg-slate-800'
                                    }`}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

/* ----------------------------- Single order ----------------------------- */

const SingleOrderItem = ({ activeOrder, onCancelOrder, onRemoveItem, removingKey, isCancelling }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [confirmItemKey, setConfirmItemKey] = useState(null);

    const status = activeOrder.status;
    const isCooking = status === 'COOKING';
    const canCancel = status === 'PENDING' && typeof onCancelOrder === 'function';
    const canEditItems = status === 'PENDING' && typeof onRemoveItem === 'function';
    const meta = STATUS_META[status] || { ...FALLBACK_META, label: status || FALLBACK_META.label };
    const StatusIcon = meta.Icon;

    const now = useNow(isCooking ? 1000 : 30000);

    const fallbackStartRef = useRef(null);
    if (isCooking && fallbackStartRef.current === null) fallbackStartRef.current = Date.now();

    useEffect(() => {
        if (status !== 'PENDING') {
            setConfirmingCancel(false);
            setConfirmItemKey(null);
        }
    }, [status]);

    let timer = null;
    if (isCooking) {
        const startMs = parseTime(activeOrder.cookingStartedAt) ?? fallbackStartRef.current ?? now;
        const estimatedMins = Number(activeOrder.estimatedMinutes) || DEFAULT_ESTIMATED_MINUTES;
        const totalMs = estimatedMins * 60 * 1000;
        const elapsedMs = Math.max(0, now - startMs);
        const remainingMs = totalMs - elapsedMs;

        timer = {
            isOverdue: remainingMs <= 0,
            timeLeft: formatCountdown(remainingMs),
            progress: Math.min(100, (elapsedMs / totalMs) * 100),
            readyAt: formatClock(startMs + totalMs)
        };
    }

    const items = activeOrder.items || [];
    const totalQty = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    const total = calcOrderTotal(activeOrder);
    const placedAt = parseTime(activeOrder.createdAt);

    const handleRemoveItem = async (item) => {
        if (typeof onRemoveItem === 'function') {
            await onRemoveItem(activeOrder, item);
        }
        setConfirmItemKey(null);
    };

    const handleConfirmCancel = async () => {
        await onCancelOrder(activeOrder);
        setConfirmingCancel(false);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4 transition-all duration-300">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-2 ${meta.color}`}>
                        <StatusIcon size={16} className={meta.iconClass} />
                        <span>{meta.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-1">
                        Order #{activeOrder.id}
                        {placedAt && <> • {formatTimeAgo(placedAt, now)}</>}
                    </p>
                </div>

                <button
                    onClick={() => setIsExpanded((v) => !v)}
                    aria-expanded={isExpanded}
                    className="bg-orange-600/10 border border-orange-500/30 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-orange-600/20 transition shrink-0"
                >
                    Details
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Progress stepper */}
            {status !== 'CANCELLED' && <OrderStepper status={status} />}

            {/* Cooking timer */}
            {timer && (
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">
                            {timer.isOverdue ? 'Ektu deri hochhe' : 'Anumanik Somoy'}
                        </span>
                        <span className={`font-bold ${timer.isOverdue ? 'text-amber-400' : 'text-orange-400'}`}>
                            {timer.isOverdue ? 'Khabar prai toiri!' : `${timer.timeLeft} min baki`}
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${timer.isOverdue
                                    ? 'bg-amber-400 animate-pulse'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-400'
                                }`}
                            style={{ width: `${timer.progress}%` }}
                        />
                    </div>
                    {!timer.isOverdue && (
                        <p className="text-[11px] text-slate-500">Prai {timer.readyAt}-e ready hobe</p>
                    )}
                </div>
            )}

            {/* Ready message */}
            {status === 'READY' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl p-3">
                    Apnar khabar toiri. Ekhuni table-e ashche!
                </div>
            )}

            {/* Expandable details */}
            {isExpanded && (
                <div className="space-y-2.5 border-t border-slate-800 pt-3">
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {items.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-2">Kono item pawa jayni.</p>
                        ) : (
                            items.map((item, idx) => {
                                const price = getItemPrice(item);
                                const qty = Number(item.quantity || 0);
                                const itemKey = String(item.menuItemId || item.id || idx);
                                const isConfirming = confirmItemKey === itemKey;
                                const isRemoving = removingKey === `${activeOrder.id}_${itemKey}`;
                                const isLastItem = items.length === 1;

                                return (
                                    <div
                                        key={item.id || item.menuItemId || idx}
                                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center gap-3"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Utensils size={14} className="text-slate-500 shrink-0" />
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-100 text-sm truncate">{item.name}</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {isConfirming && isLastItem ? (
                                                        <span className="text-red-300">Eta shesh item, order cancel hoye jabe</span>
                                                    ) : (
                                                        <>৳{price} × {qty}</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {isConfirming ? (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => setConfirmItemKey(null)}
                                                    disabled={isRemoving}
                                                    className="bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-[11px] font-bold active:scale-95 disabled:opacity-60"
                                                >
                                                    Na
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveItem(item)}
                                                    disabled={isRemoving || isCancelling}
                                                    className="bg-red-600 hover:bg-red-500 disabled:bg-red-800/80 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold active:scale-95"
                                                >
                                                    {isRemoving ? '...' : 'Muchun'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 shrink-0">
                                                {canEditItems && (
                                                    <button
                                                        onClick={() => setConfirmItemKey(itemKey)}
                                                        disabled={isCancelling || Boolean(removingKey)}
                                                        aria-label={`${item.name} bad din`}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                                <span className="font-extrabold text-orange-400 text-sm">৳{price * qty}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Footer: summary */}
            <div className="pt-1 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/60">
                <span>
                    Items: <strong className="text-white font-bold">{totalQty} ti</strong>
                </span>
                <span>
                    Bill: <strong className="text-orange-400 font-black text-sm">৳{total}</strong>
                </span>
            </div>

            {/* Cancel area */}
            {canCancel && !confirmingCancel && (
                <button
                    onClick={() => setConfirmingCancel(true)}
                    disabled={isCancelling}
                    className="w-full bg-red-600/10 hover:bg-red-600/20 disabled:opacity-60 border border-red-500/30 text-red-400 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                >
                    Order Cancel Korun
                </button>
            )}

            {canCancel && confirmingCancel && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2.5">
                    <p className="text-xs text-red-300 font-semibold text-center">
                        Order #{activeOrder.id} ki shotti cancel korben?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setConfirmingCancel(false)}
                            disabled={isCancelling}
                            className="bg-slate-800 border border-slate-700 text-slate-200 py-2 rounded-lg text-xs font-bold transition active:scale-95 disabled:opacity-60"
                        >
                            Na, rakhun
                        </button>
                        <button
                            onClick={handleConfirmCancel}
                            disabled={isCancelling}
                            className="bg-red-600 hover:bg-red-500 disabled:bg-red-800/80 text-white py-2 rounded-lg text-xs font-bold transition active:scale-95"
                        >
                            {isCancelling ? 'Cancel hochhe...' : 'Hya, cancel korun'}
                        </button>
                    </div>
                </div>
            )}

            {(status === 'COOKING' || status === 'READY') && typeof onCancelOrder === 'function' && (
                <p className="text-[11px] text-slate-500 text-center">
                    Ranna shuru hoye gele cancel kora jay na. Dorkar hole waiter-ke bolun.
                </p>
            )}
        </div>
    );
};

/* ----------------------------- Banner (list) ----------------------------- */

const OrderTrackerBanner = ({
    activeOrders,
    onCancelOrder,
    onCancelAll,
    onRemoveItem,
    removingKey,
    cancellingId,
    isCancellingAll = false
}) => {
    const [confirmingAll, setConfirmingAll] = useState(false);

    const orders = Array.isArray(activeOrders) ? activeOrders : [];

    // Admin ekhono accept kori ni = PENDING. Shudhu egulo-i cancel kora jay.
    const pendingOrders = orders.filter((o) => o.status === 'PENDING');
    const pendingTotal = pendingOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0);
    const canCancelAll = typeof onCancelAll === 'function' && pendingOrders.length >= 2;

    useEffect(() => {
        if (!canCancelAll) setConfirmingAll(false);
    }, [canCancelAll]);

    if (orders.length === 0) return null;

    const grandTotal = orders.reduce((sum, o) => sum + calcOrderTotal(o), 0);

    const handleConfirmAll = async () => {
        await onCancelAll(pendingOrders);
        setConfirmingAll(false);
    };

    return (
        <div className="space-y-3">
            {orders.length > 1 && (
                <div className="flex justify-between items-center px-1 text-xs text-slate-400">
                    <span>
                        <strong className="text-white">{orders.length} ti</strong> order cholchhe
                    </span>
                    <span>
                        Mot: <strong className="text-orange-400 font-black">৳{grandTotal}</strong>
                    </span>
                </div>
            )}

            {/* Sob pending order ekshathe cancel */}
            {canCancelAll && !confirmingAll && (
                <button
                    onClick={() => setConfirmingAll(true)}
                    disabled={isCancellingAll}
                    className="w-full bg-red-600/10 hover:bg-red-600/20 disabled:opacity-60 border border-red-500/30 text-red-400 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                >
                    Shob Pending Order Cancel Korun ({pendingOrders.length} ti)
                </button>
            )}

            {canCancelAll && confirmingAll && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2.5">
                    <p className="text-xs text-red-300 font-semibold text-center leading-relaxed">
                        {pendingOrders.length} ti pending order (৳{pendingTotal}) cancel hobe.
                        <br />
                        <span className="text-red-300/70 font-normal">
                            Admin je order accept koreche segulo cancel hobe na.
                        </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setConfirmingAll(false)}
                            disabled={isCancellingAll}
                            className="bg-slate-800 border border-slate-700 text-slate-200 py-2 rounded-lg text-xs font-bold transition active:scale-95 disabled:opacity-60"
                        >
                            Na, rakhun
                        </button>
                        <button
                            onClick={handleConfirmAll}
                            disabled={isCancellingAll}
                            className="bg-red-600 hover:bg-red-500 disabled:bg-red-800/80 text-white py-2 rounded-lg text-xs font-bold transition active:scale-95"
                        >
                            {isCancellingAll ? 'Cancel hochhe...' : 'Hya, shob cancel korun'}
                        </button>
                    </div>
                </div>
            )}

            {orders.map((order) => (
                <SingleOrderItem
                    key={order.id}
                    activeOrder={order}
                    onCancelOrder={onCancelOrder}
                    onRemoveItem={onRemoveItem}
                    removingKey={removingKey}
                    isCancelling={
                        isCancellingAll ||
                        (cancellingId !== null &&
                            cancellingId !== undefined &&
                            String(cancellingId) === String(order.id))
                    }
                />
            ))}
        </div>
    );
};

export default OrderTrackerBanner;