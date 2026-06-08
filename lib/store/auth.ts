import { create } from 'zustand';

export interface UserInfo {
  id: string;
  nickname: string;
  avatarUrl: string;
  phone: string;
}

export interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  
  login: (token: string, user: UserInfo, isAdmin: boolean) => void;
  logout: () => void;
  initialize: () => void;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const IS_ADMIN_KEY = 'isAdmin';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAdmin: false,
  isLoggedIn: false,

  login: (token, user, isAdmin) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(IS_ADMIN_KEY, String(isAdmin));
    set({ token, user, isAdmin, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(IS_ADMIN_KEY);
    set({ token: null, user: null, isAdmin: false, isLoggedIn: false });
  },

  initialize: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      const isAdminStr = localStorage.getItem(IS_ADMIN_KEY);
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ 
          token, 
          user, 
          isAdmin: isAdminStr === 'true',
          isLoggedIn: true 
        });
      }
    } catch {
      set({ token: null, user: null, isAdmin: false, isLoggedIn: false });
    }
  },
}));
