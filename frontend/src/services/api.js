import axios from 'axios';

// যদি লোকাল কম্পিউটারে (localhost) চলে তবে লোকাল সার্ভার, আর ডিপ্লয় করলে Render সার্ভার নেবে
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (isLocal 
    ? 'http://localhost:5000/api' 
    : 'https://restaurant-management-qjy5.onrender.com/api'),
});

export default API;