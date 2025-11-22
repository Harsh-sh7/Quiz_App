import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL_ENV } from '@env';

// Get API URL from environment config
// The .env file is loaded through the env.config.js file
const API_URL = `${API_URL_ENV}/api`;

// Log for debugging purposes
console.log('API_URL configured as:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.token) {
    await AsyncStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const registerUser = async (username, email, password) => {
  const response = await api.post('/auth/register', { username, email, password });
  if (response.data.token) {
    await AsyncStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const saveScore = async (scoreData) => {
  const response = await api.post('/quiz/save-score', scoreData);
  return response.data;
};

export const getUserScores = async () => {
  const response = await api.get('/quiz/user-scores');
  return response.data;
};

export const getLeaderboard = async (category = null) => {
  const url = category ? `/quiz/leaderboard?category=${category}` : '/quiz/leaderboard';
  const response = await api.get(url);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/quiz/categories');
  return response.data;
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem('token');
};

export default api;
