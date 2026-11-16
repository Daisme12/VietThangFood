import { create } from 'zustand';
import { CurrentUser } from '../types/common.types';

interface AuthState {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: 1,
    username: 'admin',
    fullName: 'Quản trị viên VietThangFood',
    role: 'admin',
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('vtf_access_token');
    set({ user: null });
  },
}));

