import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_URL_ENV } from '@env';

// Get API URL from Expo Config (Production) or .env (Development)
// Fallback to local IP if config is missing or localhost
const getBaseUrl = () => {
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl) return configUrl;
  
  if (API_URL_ENV) return API_URL_ENV;
  
  return 'http://10.7.7.66:3000';
};

const API_URL = `${getBaseUrl()}/api`;

// Log for debugging purposes
console.log('API_URL configured as:', API_URL);
console.log('Expo Config URL:', Constants.expoConfig?.extra?.apiUrl);
console.log('Env URL:', API_URL_ENV);

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

export const updateUserProfile = async (formData) => {
  const response = await api.put('/auth/me', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Social API
export const searchUsers = async (query) => {
  const response = await api.get(`/social/search?query=${query}`);
  return response.data;
};

export const sendFriendRequest = async (userId) => {
  const response = await api.post('/social/friend-request', { userId });
  return response.data;
};

export const acceptFriendRequest = async (userId) => {
  const response = await api.post('/social/friend-accept', { userId });
  return response.data;
};

export const getFriends = async () => {
  const response = await api.get('/social/friends');
  return response.data;
};

export const createChallenge = async (data) => {
  const response = await api.post('/social/challenge', data);
  return response.data;
};

export const acceptChallenge = async (challengeId) => {
  const response = await api.post('/social/challenge/accept', { challengeId });
  return response.data;
};

export const getPendingChallenges = async () => {
  const response = await api.get('/social/challenges/pending');
  return response.data;
};

export const completeChallenge = async (data) => {
  const response = await api.post('/social/challenge/complete', data);
  return response.data;
};

export const getNotifications = async () => {
  const response = await api.get('/social/notifications');
  return response.data;
};

export const getChallengeStatus = async (challengeId) => {
  const response = await api.get(`/social/challenge/${challengeId}/status`);
  return response.data;
};

export const saveChallengeQuestions = async (challengeId, questions) => {
  const response = await api.post(`/social/challenge/${challengeId}/questions`, { questions });
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
