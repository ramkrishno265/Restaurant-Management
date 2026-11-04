import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import API from '../../services/api';
import { 
  Utensils, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  ToggleLeft, 
  ToggleRight,
  X,
  Check,
  Tag
} from 'lucide-react';

const AdminMenu = () => {
  const { menuItems, setMenuItems } = useOutletContext();

  // Local Search & Category Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal State (Add & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryName: '',
    imageUrl: '',
    isAvailable: true
  });

  // Modal Open Handler (Create or Edit)
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price || '',
        categoryName: item.categoryName || item.category?.name || 'Main',
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable ?? true
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        categoryName: 'Main',
        imageUrl: '',
        isAvailable: true
      });
    }
    setIsModalOpen(true);
  };

  // Toggle Stock Availability
  const toggleAvailability = async (itemId, currentStatus) => {
    try {
      await API.patch(`/menu/items/${itemId}/toggle`, { isAvailable: !currentStatus });
    } catch (e) {
      console.error(e);
    }
    setMenuItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, isAvailable: !currentStatus } : item))
    );
  };

  // Submit Handler (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert('আইটেমের নাম এবং দাম অবশ্যই দিতে হবে।');
      return;
    }

    try {
      if (editingItem) {
        // Update Item
        const res = await API.put(`/menu/items/${editingItem.id}`, formData);
        setMenuItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...formData, ...res.data } : i))
        );
      } else {
        // Create New Item
        const res = await API.post('/menu/items', formData);
        setMenuItems((prev) => [...prev, res.data]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      // Fallback update for UI testing
      if (editingItem) {
        setMenuItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...formData } : i))
        );
      } else {
        const newItem = { id: Date.now().toString(), ...formData, price: Number(formData.price) };
        setMenuItems((prev) => [...prev, newItem]);
      }
      setIsModalOpen(false);
    }
  };

  // Delete Item Handler
  const handleDelete = async (itemId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই মেনু আইটেমটি মুছে ফেলতে চান?')) return;

    try {
      await API.delete(`/menu/items/${itemId}`);
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  // Extract Unique Categories for Filter Tabs
  const categories = ['ALL', ...new Set(menuItems.map((i) => i.categoryName || i.category?.name || 'Main'))];

  // Filtered Items Logic
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const itemCat = item.categoryName || item.category?.name || 'Main';
    const matchesCat = selectedCategory === 'ALL' || itemCat === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & ADD BUTTON */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Utensils className="text-orange-500" size={24} /> ডিজিটাল মেনু ম্যানেজমেন্ট
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            রেস্তোরাঁর খাবারের আইটেম যোগ করুন, সম্পাদনা করুন, ছবি দিন এবং স্টক অন/অফ ট্র্যাকিং করুন।
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-orange-600/20 transition"
        >
          <Plus size={18} /> নতুন আইটেম যোগ করুন
        </button>
      </div>

      {/* 2. SEARCH & CATEGORY FILTER TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="খাবারের নাম দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
          />
        </div>

        {/* Category Badges */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                selectedCategory === cat
                  ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MENU ITEMS GRID */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center text-slate-400">
          কোনো মেনু আইটেম পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-800 border rounded-2xl p-4 flex flex-col justify-between transition shadow-lg relative overflow-hidden group ${
                item.isAvailable
                  ? 'border-slate-700/80 hover:border-slate-600'
                  : 'border-slate-800 bg-slate-900/60 opacity-70'
              }`}
            >
              <div>
                {/* Image & Badges */}
                <div className="relative w-full h-40 bg-slate-950 rounded-xl overflow-hidden mb-3.5 border border-slate-700/50">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                      <ImageIcon size={36} />
                      <span className="text-[10px] mt-1">ছবি নেই</span>
                    </div>
                  )}

                  {/* Price Tag Badge */}
                  <span className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md border border-orange-500/30 text-orange-400 font-black text-xs px-2.5 py-1 rounded-lg">
                    ৳{item.price}
                  </span>

                  {/* Category Tag */}
                  <span className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-700">
                    <Tag size={10} className="text-orange-400" />
                    {item.categoryName || item.category?.name || 'Main'}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-bold text-white text-base truncate">{item.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description || 'কোনো বিবরণ দেওয়া হয়নি।'}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2 mt-4">
                {/* Stock Toggle Button */}
                <button
                  onClick={() => toggleAvailability(item.id, item.isAvailable)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                    item.isAvailable
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                >
                  {item.isAvailable ? (
                    <><ToggleRight size={18} /> Available</>
                  ) : (
                    <><ToggleLeft size={18} /> Out of Stock</>
                  )}
                </button>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-2 bg-slate-900 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                    title="সম্পাদনা করুন"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 hover:border-rose-500/40 transition"
                    title="আইটেম মুছুন"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. CREATE / EDIT ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Utensils className="text-orange-500" size={20} /> 
                {editingItem ? 'মেনু আইটেম সম্পাদনা করুন' : 'নতুন আইটেম যোগ করুন'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  আইটেমের নাম <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: চিকেন বার্গার, কোল্ড কফি"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    মূল্য (৳) <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="250"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    ক্যাটাগরি
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: Fast Food, Drinks"
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  ছবির URL (Image URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  খাবারের বিবরণ (Description)
                </label>
                <textarea
                  rows="3"
                  placeholder="খাবারটি সম্পর্কে সংক্ষিপ্ত বিবরণ লিখুন..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 transition flex items-center justify-center gap-1.5"
                >
                  <Check size={16} /> {editingItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminMenu;