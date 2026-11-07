import React, { useState, useEffect } from 'react';
import { Clock, Eye, ChefHat, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const SingleOrderItem = ({ activeOrder, onViewDetails }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);

    const steps = ['PENDING', 'COOKING', 'READY', 'SERVED'];
    const currentStepIndex = steps.indexOf(activeOrder.status);

    useEffect(() => {
        if (activeOrder.status !== 'COOKING') return;

        const startTime = activeOrder.cookingStartedAt 
            ? new Date(activeOrder.cookingStartedAt).getTime() 
            : new Date().getTime();

        const estimatedMins = Number(activeOrder.estimatedMinutes) || 20;
        const totalDurationMs = estimatedMins * 60 * 1000;

        const updateTimer = () => {
            const now = new Date().getTime();
            const elapsedMs = now - startTime;
            const remainingMs = totalDurationMs - elapsedMs;

            if (remainingMs <= 0) {
                setTimeLeft('Khabar toiri pray shesh!');
                setProgressPercent(100);
            } else {
                const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
                setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs} min baki`);
                
                const pct = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
                setProgressPercent(pct);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeOrder.status, activeOrder.cookingStartedAt, activeOrder.estimatedMinutes]);

    const getStatusBadge = () => {
        switch (activeOrder.status) {
            case 'PENDING':
                return { label: 'Order Grohon Kora Hoyeche', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <Clock size={16} className="animate-pulse" /> };
            case 'COOKING':
                return { label: 'Rannagore Khabar Toiri Hochhe', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', icon: <ChefHat size={16} className="animate-bounce" /> };
            case 'READY':
                return { label: 'Khabar Toiri! Poribeshon Kora Hochhe', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 size={16} /> };
            default:
                return { label: activeOrder.status, color: 'text-slate-400 bg-slate-800 border-slate-700', icon: <AlertCircle size={16} /> };
        }
    };

    const statusBadge = getStatusBadge();

    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3.5 transition-all duration-300">
            <div className="flex items-center justify-between gap-2">
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 ${statusBadge.color}`}>
                    {statusBadge.icon}
                    <span>{statusBadge.label} (Order #{activeOrder.id})</span>
                </div>
                <button
                    onClick={() => onViewDetails(activeOrder)}
                    className="bg-orange-600/10 border border-orange-500/30 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-orange-600/20 transition shrink-0"
                >
                    <Eye size={14} /> Details
                </button>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-1 text-center text-[10px] font-black uppercase tracking-wider">
                <div className={currentStepIndex >= 0 ? 'text-orange-400 border-b-2 border-orange-500 pb-1' : 'text-slate-600 border-b-2 border-slate-800 pb-1'}>1. Pending</div>
                <div className={currentStepIndex >= 1 ? 'text-orange-400 border-b-2 border-orange-500 pb-1' : 'text-slate-600 border-b-2 border-slate-800 pb-1'}>2. Cooking</div>
                <div className={currentStepIndex >= 2 ? 'text-orange-400 border-b-2 border-orange-500 pb-1' : 'text-slate-600 border-b-2 border-slate-800 pb-1'}>3. Ready</div>
                <div className={currentStepIndex >= 3 ? 'text-emerald-400 border-b-2 border-emerald-500 pb-1' : 'text-slate-600 border-b-2 border-slate-800 pb-1'}>4. Served</div>
            </div>

            {activeOrder.status === 'COOKING' && (
                <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Anumanik Somoy:</span>
                        <span className="text-orange-400 font-bold">{timeLeft}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            )}

            <div className="pt-1 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/60">
                <span>Items: <strong className="text-white font-bold">{activeOrder.items?.length || 0} ti</strong></span>
                <span>Bill: <strong className="text-orange-400 font-black text-sm">৳{activeOrder.totalAmount}</strong></span>
            </div>
        </div>
    );
};

const OrderTrackerBanner = ({ activeOrders, onViewDetails }) => {
    if (!activeOrders || activeOrders.length === 0) return null;
    return (
        <div className="space-y-3">
            {activeOrders.map((order) => (
                <SingleOrderItem key={order.id} activeOrder={order} onViewDetails={onViewDetails} />
            ))}
        </div>
    );
};

export default OrderTrackerBanner;