import { create } from 'zustand';
import * as secureStorage from '../utils/secureStorage';
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
    await secureStorage.setItem('auth_token', token);
    await secureStorage.setItem('user_data', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  clearAuth: async () => {
    await secureStorage.removeItem('auth_token');
    await secureStorage.removeItem('user_data');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadAuth: async () => {
    try {
      const token = await secureStorage.getItem('auth_token');
      const userData = await secureStorage.getItem('user_data');
      
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
  // Session-scoped: whether the parent PIN has been verified since app launch/login.
  // Never persisted, so it's re-required on every fresh app start.
  parentUnlocked: boolean;
  setFamily: (family: Family) => void;
  setCurrentChild: (child: Child | null) => void;
  setChildren: (children: Child[]) => void;
  setTheme: (theme: Theme) => void;
  setParentUnlocked: (unlocked: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  family: null,
  currentChild: null,
  children: [],
  theme: 'football',
  parentUnlocked: false,

  setFamily: (family) => set({ family, theme: family.theme }),
  setCurrentChild: (child) => set({ currentChild: child }),
  setChildren: (children) => set({ children }),
  setTheme: (theme) => set({ theme }),
  setParentUnlocked: (unlocked) => set({ parentUnlocked: unlocked }),
  reset: () => set({ family: null, currentChild: null, children: [], theme: 'football', parentUnlocked: false }),
}));
