import axios from 'axios';

// Vite প্রজেক্ট হলে:
const BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : 'http://localhost:5000/api';

/* Create React App (CRA) হলে উপরেরটির বদলে নিচের লাইনটি ব্যবহার করুন:
const BASE_URL = process.env.REACT_APP_API_URL 
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:5000/api';
*/

const API = axios.create({
  baseURL: BASE_URL,
});

export default API;