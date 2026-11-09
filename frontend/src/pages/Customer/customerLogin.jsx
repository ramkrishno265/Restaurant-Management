import React, { useState } from 'react';
import API from '../../services/api';
import { Utensils, User, Phone, Sparkles, AlertCircle } from 'lucide-react';

const CustomerLoginModal = ({ tableId, isOpen, onSuccess }) => {
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveCustomerInfo = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      setErrorMessage('আপনার নাম এবং ফোন নম্বর লিখুন');
      return;
    }

    try {
      setLoading(true);
      const res = await API.post(`/tables/${tableId}/occupy`, {
        name: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
      });

      if (res.data.success) {
        // LocalStorage-এ কাস্টমার সেভ করা
        localStorage.setItem(`customer_table_${tableId}`, JSON.stringify(customerInfo));
        
        // Parent component-কে আপডেট জানানো
        if (onSuccess) {
          onSuccess(customerInfo);
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setErrorMessage('❌ এই টেবিলটিতে এখন অন্য কাস্টমার আছেন! দয়া করে অন্য টেবিলে বসুন অথবা ওয়েটার ডাকুন।');
      } else {
        setErrorMessage('টেবিল সেটিংসে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-t sm:border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Top Indicator Handle bar for Mobile */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-5 sm:hidden"></div>

        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-600/10">
            <Utensils size={32} />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">রেস্তোরাঁয় স্বাগতম!</h2>
          <p className="text-xs text-slate-400 mt-1">
            টেবিল নম্বর <span className="text-orange-400 font-bold">#{tableId}</span> • খাবার অর্ডার করতে নাম ও মোবাইল নম্বর দিন
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSaveCustomerInfo} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-orange-400" /> Your Name
            </label>
            <input
              type="text"
              required
              placeholder="Please Enter Your Name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone size={14} className="text-orange-400" /> Mobile Number
            </label>
            <input
              type="tel"
              required
              placeholder="Enter Your Mobile Number"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 active:bg-orange-700 hover:bg-orange-500 disabled:bg-orange-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 mt-2 text-base"
          >
            {loading ? (
              <span className="text-sm">সাবমিট হচ্ছে...</span>
            ) : (
              <>
                <Sparkles size={20} /> মেনু দেখুন
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomerLoginModal;