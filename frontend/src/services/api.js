import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (isLocal 
    ? 'http://localhost:5000/api' 
    : 'https://restaurant-management-qjy5.onrender.com/api'),
});

// 🌟 ইন্টারসেপ্টর: ব্রাউজারের লোকালস্টোরেজ থেকে টোকেন থাকলে তা অটোমেটিক হেডার-এ যুক্ত করবে (401 দূর করার জন্য)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // আপনার প্রজেক্টে যে নামে টোকেন সেভ করা হয়
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;