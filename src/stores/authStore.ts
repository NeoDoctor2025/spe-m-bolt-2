import { create } from 'zustand';
import type { Session, User, Subscription } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

let authSubscription: Subscription | null = null;

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  orgId: string | null;
  role: 'admin' | 'doctor' | 'reception' | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  orgId: null,
  role: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const orgId = session.user.app_metadata?.org_id ?? null;
        const role = session.user.app_metadata?.role ?? null;
        set({ user: session.user, session, orgId, role });
        await get().fetchProfile();
      }
    } catch {
      // Network failure — allow app to show login
    }

    set({ initialized: true, loading: false });

    if (authSubscription) {
      authSubscription.unsubscribe();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const orgId = session?.user.app_metadata?.org_id ?? null;
      const role = session?.user.app_metadata?.role ?? null;
      set({ user: session?.user ?? null, session, orgId, role });
      if (session?.user) {
        (async () => {
          await get().fetchProfile();
        })();
      } else {
        set({ profile: null });
      }
    });

    authSubscription = subscription;
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    set({ loading: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, orgId: null, role: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) set({ profile: data });
  },

  updateProfile: async (profileData) => {
    const { user } = get();
    if (!user) return { error: 'Usuário não autenticado' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...profileData, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return { error: error.message };
    await get().fetchProfile();
    return { error: null };
  },
}));

export const useOrgId = () => useAuthStore(s => s.orgId);
export const useRole = () => useAuthStore(s => s.role);
