export interface TikTokSession {
  cookies: string;
  username?: string;
  userId?: string;
  expiresAt?: number;
  updatedAt: number;
}

export interface AuthState {
  tiktok: TikTokSession | null;
}

export interface AuthActions {
  setTikTokSession: (session: TikTokSession | null) => void;
  clearSession: () => void;
}

export type AuthStore = AuthState & AuthActions;
