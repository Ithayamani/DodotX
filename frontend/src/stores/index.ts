import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Family, Child, Theme } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  
  setAuth: async (user, token) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },
  
  clearAuth: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
  
  loadAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      set({ isLoading: false });
    }
  },
}));

interface AppState {
  family: Family | null;
  currentChild: Child | null;
  children: Child[];
  theme: Theme;
  setFamily: (family: Family) => void;
  setCurrentChild: (child: Child | null) => void;
  setChildren: (children: Child[]) => void;
  setTheme: (theme: Theme) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  family: null,
  currentChild: null,
  children: [],
  theme: 'football',
  
  setFamily: (family) => set({ family, theme: family.theme }),
  setCurrentChild: (child) => set({ currentChild: child }),
  setChildren: (children) => set({ children }),
  setTheme: (theme) => set({ theme }),
  reset: () => set({ family: null, currentChild: null, children: [], theme: 'football' }),
}));
