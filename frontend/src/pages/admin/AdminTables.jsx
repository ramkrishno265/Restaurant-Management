import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext'; // Socket hook import
import { 
  Table as TableIcon, 
  Plus, 
  Users, 
  QrCode, 
  Trash2, 
  ExternalLink, 
  Search,
  CheckCircle2,
  XCircle,
  UserCheck,
  RotateCcw
} from 'lucide-react';

const AdminTables = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const socket = useSocket(); // Socket instance

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');

  // 1. Fetch initial tables from Backend API
  useEffect(() => {
    fetchTables();
  }, []);

  // 2. LIVE REAL-TIME SOCKET LISTENER FOR ADMIN
  useEffect(() => {
    if (!socket) return;

    // Admin room-এ জয়েন করা
    socket.emit('join_admin');

    // Customer occupy করলে বা Admin clear করলে real-time event শোনা
    const handleTableUpdated = (updatedTable) => {
      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === updatedTable.id || String(t.tableNumber) === String(updatedTable.tableNumber)
            ? { ...t, ...updatedTable }
            : t
        )
      );
    };

    socket.on('table_updated', handleTableUpdated);

    return () => {
      socket.off('table_updated', handleTableUpdated);
    };
  }, [socket]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await API.get('/tables');
      setTables(res.data);
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add New Table Handler
  
const handleAddTable = async (e) => {
  e.preventDefault();

  if (!newTableNumber) return;

  try {
    const payload = {
      tableNumber: newTableNumber,
      capacity: parseInt(newCapacity),
    };

    const res = await API.post('/tables', payload);

    setTables((prev) => [...prev, res.data]);

    alert("Table created successfully!");

    setNewTableNumber('');
    setNewCapacity('4');
    setIsModalOpen(false);

  } catch (err) {

    if (err.response?.status === 409) {
      alert("This table is already created.");
      return;
    }

    alert(
      err.response?.data?.message ||
      "Failed to create table!"
    );
  }
};


  // Clear Table Handler (Admin)
  const handleClearTable = async (tableId) => {
    if (!window.confirm('আপনি কি এই কাস্টমারকে টেবিল থেকে সরিয়ে টেবিলটি ফাঁকা করতে চান?')) return;

    try {
      await API.patch(`/tables/${tableId}/clear`);
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? { ...t, isOccupied: false, currentCustomerName: null, currentCustomerPhone: null }
            : t
        )
      );
    } catch (err) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? { ...t, isOccupied: false, currentCustomerName: null, currentCustomerPhone: null }
            : t
        )
      );
    }
  };

  // Delete Table Handler
  const handleDeleteTable = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই টেবিলটি মুছে ফেলতে চান?')) return;

    try {
      await API.delete(`/tables/${id}`);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setTables((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Copy Table QR Code URL
  const copyQRLink = (tableNumber) => {
    const url = `${window.location.origin}/table/${tableNumber}`;
    navigator.clipboard.writeText(url);
    alert(`টেবিল #${tableNumber}-এর লিঙ্ক কপি হয়েছে:\n${url}`);
  };

  // Filter tables based on search
  const filteredTables = tables.filter((t) =>
    t.tableNumber.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER SECTION & ACTIONS */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TableIcon className="text-orange-500" size={22} /> Table Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            রেস্তোরাঁর মোট টেবিল সংখ্যা, সিট ক্যাপাসিটি এবং লাইভ কাস্টমার স্ট্যাটাস পরিচালনা করুন।
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-orange-600/20 transition"
        >
          <Plus size={18} /> নতুন টেবিল যোগ করুন
        </button>
      </div>

      {/* 2. STATS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="টেবিল নম্বর খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
            মোট টেবিল: <strong className="text-white">{tables.length}</strong>
          </span>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg">
            ফাঁকা আছে: <strong className="text-emerald-400">{tables.filter((t) => !t.isOccupied).length}</strong>
          </span>
        </div>
      </div>

      {/* 3. TABLE GRID DISPLAY */}
      {filteredTables.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center text-slate-400">
          কোনো টেবিল পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className={`bg-slate-800 border rounded-2xl p-5 flex flex-col justify-between transition shadow-lg relative overflow-hidden group ${
                table.isOccupied
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div>
                {/* Header Info */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-orange-400 font-extrabold text-lg">
                      #{table.tableNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">টেবিল {table.tableNumber}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Users size={14} className="text-slate-400" />
                        <span>{table.capacity} জনের সিট</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition opacity-0 group-hover:opacity-100"
                    title="টেবিল মুছুন"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Occupied vs Available View */}
                <div className="my-3">
                  {table.isOccupied ? (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-extrabold text-amber-400 flex items-center gap-1">
                          <XCircle size={13} /> কাস্টমার আছে (Occupied)
                        </span>
                        <button
                          onClick={() => handleClearTable(table.id)}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow"
                          title="কাস্টমার সরান ও টেবিল খালি করুন"
                        >
                          <RotateCcw size={12} /> Clear Table
                        </button>
                      </div>

                      <div className="border-t border-amber-500/20 pt-2 text-xs">
                        <p className="font-bold text-white flex items-center gap-1.5">
                          <UserCheck size={13} className="text-orange-400" />
                          {table.currentCustomerName || 'Guest Customer'}
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5 pl-4">
                          📱 {table.currentCustomerPhone || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold">
                      <CheckCircle2 size={15} /> ফাঁকা আছে (Available)
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Action Buttons */}
              <div className="pt-3 border-t border-slate-700/80 flex items-center gap-2 mt-2">
                <button
                  onClick={() => copyQRLink(table.tableNumber)}
                  className="flex-1 bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <QrCode size={14} className="text-orange-400" /> QR Link
                </button>

                <a
                  href={`/table/${table.tableNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 p-2 rounded-xl transition"
                  title="কাস্টমার ভিউ প্রাকদর্শন করুন"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. ADD TABLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TableIcon className="text-orange-500" size={20} /> নতুন টেবিল যুক্ত করুন
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  টেবিল নম্বর / আইডি
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 5, 6A, T-12"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  বসার ক্ষমতা (Capacity / Seats)
                </label>
                <select
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="2">২ জন (Small Table)</option>
                  <option value="4">৪ জন (Standard Table)</option>
                  <option value="6">৬ জন (Family Table)</option>
                  <option value="8">৮ জন (Large Party)</option>
                  <option value="12">১২+ জন (VIP / Banquet)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 transition"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTables;