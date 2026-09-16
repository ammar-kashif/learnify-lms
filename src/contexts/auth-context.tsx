'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/postgrest-js';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: 'student' | 'teacher' | 'admin' | 'superadmin';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Whether the role for the current user is known.
 *
 * 'loading' — a lookup is in flight; nothing role-specific may render yet.
 * 'ready'   — userRole is authoritative (null means the user has no profile row).
 * 'error'   — the lookup failed. userRole holds the last known good value, which
 *             may be stale, so consumers must not treat it as authoritative.
 */
export type RoleStatus = 'loading' | 'ready' | 'error';

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  roleStatus: RoleStatus;
  refreshRole: () => Promise<void>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string
  ) => Promise<{ error: AuthError | PostgrestError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_COLUMNS =
  'id, email, full_name, phone_number, role, avatar_url, created_at, updated_at';
const PROFILE_TIMEOUT_MS = 6000;
const PROFILE_ATTEMPTS = 3;

type ProfileResult =
  | { status: 'ok'; profile: UserProfile }
  | { status: 'missing' }
  | { status: 'error' };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Profile fetch timed out')),
      ms
    );
    Promise.resolve(promise).then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Read the user's profile row, retrying transient failures.
 *
 * A network blip or a slow response must not be reported the same way as "this
 * user has no profile": the caller decides very different things from each, and
 * conflating them is what let a failed lookup silently downgrade a teacher.
 */
async function fetchProfile(userId: string): Promise<ProfileResult> {
  for (let attempt = 0; attempt < PROFILE_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('users').select(PROFILE_COLUMNS).eq('id', userId).single(),
        PROFILE_TIMEOUT_MS
      );

      // PGRST116 is "no rows". The row genuinely is not there, so retrying
      // cannot change the answer.
      if (error && error.code === 'PGRST116') return { status: 'missing' };
      if (!error && data) return { status: 'ok', profile: data as UserProfile };

      console.error('Error fetching user profile:', error);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }

    if (attempt < PROFILE_ATTEMPTS - 1) await sleep(300 * 2 ** attempt);
  }

  return { status: 'error' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleStatus, setRoleStatus] = useState<RoleStatus>('loading');

  // Only the most recent resolution may write to state. Two lookups can be in
  // flight at once (the initial session and a SIGNED_IN event, say), and
  // without this the slower one wins and can install a stale role.
  const roleSeqRef = useRef(0);
  // The user the role currently in state belongs to.
  const roleUserIdRef = useRef<string | null>(null);
  // Mirrors userRole so the auth listener, which is registered once and closes
  // over the first render's state, can read the current value.
  const userRoleRef = useRef<string | null>(null);

  const applyProfile = useCallback(
    (userId: string, profile: UserProfile | null) => {
      roleUserIdRef.current = userId;
      userRoleRef.current = profile?.role ?? null;
      setUserProfile(profile);
      setUserRole(profile?.role ?? null);
    },
    []
  );

  const clearRole = useCallback(() => {
    // Invalidate anything in flight so a late response cannot resurrect the
    // role of a user who has just signed out.
    roleSeqRef.current += 1;
    roleUserIdRef.current = null;
    userRoleRef.current = null;
    setUserProfile(null);
    setUserRole(null);
    setRoleStatus('ready');
  }, []);

  const loadRole = useCallback(
    async (userId: string, force = false) => {
      // Already resolved for this user. Token refreshes and metadata updates
      // re-fire the auth listener, and refetching on each one is what gave a
      // transient failure a chance to overwrite a good role.
      if (!force && roleUserIdRef.current === userId && userRoleRef.current) {
        return;
      }

      const seq = roleSeqRef.current + 1;
      roleSeqRef.current = seq;
      setRoleStatus('loading');

      const result = await fetchProfile(userId);

      // A newer resolution started while this one was in flight.
      if (seq !== roleSeqRef.current) return;

      if (result.status === 'ok') {
        applyProfile(userId, result.profile);
        setRoleStatus('ready');
      } else if (result.status === 'missing') {
        applyProfile(userId, null);
        setRoleStatus('ready');
      } else {
        // Keep whatever we had rather than demoting the user to no role.
        // Consumers gate on roleStatus, so nothing renders as if this were
        // an authoritative answer.
        setRoleStatus('error');
      }
    },
    [applyProfile]
  );

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile(prev => (prev ? { ...prev, ...updates } : prev));
    if (updates.role) {
      userRoleRef.current = updates.role;
      setUserRole(updates.role);
    }
  }, []);

  const refreshRole = useCallback(async () => {
    const userId = user?.id;
    if (userId) await loadRole(userId, true);
  }, [user?.id, loadRole]);

  useEffect(() => {
    let active = true;

    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadRole(session.user.id);
        } else {
          clearRole();
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;

      // Avoid logging raw tokens in the console
      console.log('Auth state changed:', event, {
        userId: session?.user?.id ?? null,
        expires_at: session?.expires_at ?? null,
      });

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // A no-op when this user's role is already resolved, so TOKEN_REFRESHED
        // and USER_UPDATED do not trigger a redundant lookup.
        await loadRole(session.user.id);
      } else {
        clearRole();
      }

      if (active) setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadRole, clearRole]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      // Resolve the role before returning, so the caller never navigates into
      // a role-specific screen while it is still unknown. Forced, because a
      // previous session in this tab may have left a role cached.
      if (data.user) {
        await loadRole(data.user.id, true);
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string
  ) => {
    try {
      // Use our server-side API endpoint instead of client-side signup
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          fullName: fullName,
          phoneNumber: phoneNumber,
          // All signups are automatically student role
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('User creation failed:', result.error);
        return { error: { message: result.error } as AuthError };
      }

      // Now sign in the user to establish a session
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

      if (signInError) {
        console.error('Sign in failed after signup:', signInError);
        return { error: signInError };
      }

      // Read the role back rather than assuming it, so the same rules apply
      // here as on any other sign-in.
      if (signInData.user) {
        await loadRole(signInData.user.id, true);
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Sign out error:', error);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Clear local state and leave either way. Staying on screen as a
      // signed-in user after a failed sign-out is worse than a redirect that
      // raced the network.
      setUser(null);
      setSession(null);
      clearRole();

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: error as AuthError };
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    userRole,
    roleStatus,
    refreshRole,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
