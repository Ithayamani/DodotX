import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type {
  AuthResponse, LoginCredentials, SignupData, User,
  Family, FamilyCreate, Child, ChildCreate,
  Task, TaskCreate, Reward, RewardCreate,
  Progress, CheerMessage, CheerCreate,
  AITaskSuggestion, AITaskResponse
} from '../types';

// Get backend URL from environment
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },
  
  login: async (data: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Family API
export const familyAPI = {
  create: async (data: FamilyCreate): Promise<Family> => {
    const response = await api.post('/family', data);
    return response.data;
  },
  
  get: async (): Promise<Family> => {
    const response = await api.get('/family');
    return response.data;
  },
  
  update: async (data: Partial<Family>): Promise<Family> => {
    const response = await api.put('/family', data);
    return response.data;
  },
  
  regenerateCode: async (): Promise<{ code: string; generated_at: string; expires_at: string }> => {
    const response = await api.post('/family/regenerate-code');
    return response.data;
  },
  
  verifyPin: async (pin: string): Promise<{ success: boolean }> => {
    const response = await api.post('/family/verify-pin', null, {
      params: { pin },
    });
    return response.data;
  },
  
  verifyCode: async (code: string): Promise<{ family_id: string; family_name: string; theme: string }> => {
    const response = await api.post('/family/verify-code', { code });
    return response.data;
  },
  
  joinChild: async (family_code: string, child_name: string): Promise<any> => {
    const response = await api.post('/family/join-child', { family_code, child_name });
    return response.data;
  },
};

// Children API
export const childrenAPI = {
  create: async (data: ChildCreate): Promise<Child> => {
    const response = await api.post('/children', data);
    return response.data;
  },
  
  getAll: async (): Promise<Child[]> => {
    const response = await api.get('/children');
    return response.data;
  },
  
  getOne: async (id: string): Promise<Child> => {
    const response = await api.get(`/children/${id}`);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Child>): Promise<Child> => {
    const response = await api.put(`/children/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/children/${id}`);
  },
};

// Tasks API
export const tasksAPI = {
  create: async (data: TaskCreate): Promise<Task> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },
  
  getAll: async (): Promise<Task[]> => {
    const response = await api.get('/tasks');
    return response.data;
  },
  
  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
  
  toggle: async (taskId: string, childId: string): Promise<{ success: boolean; points: number; completed: boolean }> => {
    const response = await api.post(`/tasks/${taskId}/toggle`, null, {
      params: { child_id: childId },
    });
    return response.data;
  },
};

// Rewards API
export const rewardsAPI = {
  create: async (data: RewardCreate): Promise<Reward> => {
    const response = await api.post('/rewards', data);
    return response.data;
  },
  
  getAll: async (): Promise<Reward[]> => {
    const response = await api.get('/rewards');
    return response.data;
  },
  
  update: async (id: string, data: Partial<Reward>): Promise<Reward> => {
    const response = await api.put(`/rewards/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/rewards/${id}`);
  },
};

// Progress API
export const progressAPI = {
  get: async (childId: string): Promise<Progress> => {
    const response = await api.get(`/progress/${childId}`);
    return response.data;
  },
};

// Cheers API
export const cheersAPI = {
  send: async (data: CheerCreate): Promise<CheerMessage> => {
    const response = await api.post('/cheers', data);
    return response.data;
  },
  
  get: async (childId: string): Promise<CheerMessage[]> => {
    const response = await api.get(`/cheers/${childId}`);
    return response.data;
  },
};

// AI API
export const aiAPI = {
  suggestTasks: async (data: AITaskSuggestion): Promise<AITaskResponse[]> => {
    const response = await api.post('/ai/suggest-tasks', data);
    return response.data;
  },
  
  generateTheme: async (description: string): Promise<any> => {
    const response = await api.post('/ai/generate-theme', { description });
    return response.data;
  },
};

export default api;
