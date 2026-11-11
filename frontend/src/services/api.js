import axios from 'axios';

const API = axios.create({
  baseURL: 'https://restaurant-management-qjy5.onrender.com/api',
});

export default API;