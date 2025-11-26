'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/postgrest-js';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin' | 'superadmin';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: AuthError | PostgrestError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const lastRoleUserIdRef = useRef<string | null>(null);

  // Function to fetch user role from profile
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      console.log('🔍 Fetching user role for ID:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Role fetch timeout')), 10000)
      );
      
      const fetchPromise = supabase
        .from('users')
        .select('id, role, avatar_url, full_name, email, created_at, updated_at')
        .eq('id', userId)
        .single();
      
      const { data: profile, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return null;
      }
      
      console.log('✅ Successfully fetched user profile:', profile);
      setUserProfile(profile);
      return profile?.role;
    } catch (error) {
      console.error('❌ Error fetching user role:', error);
      return null;
    }
  }, []);

  // Function to update user profile
  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Removed unused getRoleWithFallback to satisfy linter

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Avoid logging raw tokens in the console
      console.log('Auth state changed:', event, {
        userId: session?.user?.id ?? null,
        expires_at: session?.expires_at ?? null,
      });
      setSession(session);
      setUser(session?.user ?? null);
      
      // Fetch user role if we have a user
      if (session?.user) {
        // Prevent duplicate role fetches for the same user (helps with StrictMode double effects)
        if (lastRoleUserIdRef.current !== session.user.id || !userRole) {
          lastRoleUserIdRef.current = session.user.id;
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        }
      } else {
        setUserRole(null);
        lastRoleUserIdRef.current = null;
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

      // If signin is successful, check if user profile exists
      if (data.user) {
        console.log('🔍 Checking if user profile exists for:', data.user.id);
        console.log('🔍 User metadata:', data.user.user_metadata);

        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist - user needs to be created by superadmin
            console.log('❌ User profile not found - user must be created by superadmin');
            console.log('🔍 User ID:', data.user.id);
            console.log('🔍 User email:', data.user.email);
            
            // Don't create profile automatically - return null role
            return { error: null };
          } else if (profile) {
            console.log('✅ User profile found:', profile);
            console.log('🔍 Profile role:', profile.role);
            
            // Set the user role immediately
            setUserRole(profile.role);
            
            // Update user metadata with the role from the profile if it's different
            if (profile.role !== data.user.user_metadata?.role) {
              console.log('🔄 Updating user metadata role from profile:', profile.role);
              try {
                const { error: updateError } = await supabase.auth.updateUser({
                  data: { role: profile.role }
                });
                if (updateError) {
                  console.error('❌ Failed to update user metadata:', updateError);
                } else {
                  console.log('✅ User metadata updated with role:', profile.role);
                }
              } catch (updateError) {
                console.error('❌ Error updating user metadata:', updateError);
              }
            }
          }
        } catch (profileError) {
          console.error('❌ Error checking/creating user profile:', profileError);
          // Don't fail the signin if profile operations fail
        }
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
    fullName: string
  ) => {
    try {
      console.log('🚀 Starting signup process for:', email);

      // Use our server-side API endpoint instead of client-side signup
      console.log('🔐 Creating user via server API...');
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          fullName: fullName
          // All signups are automatically student role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ User creation failed:', result.error);
        return { error: { message: result.error } as AuthError };
      }

      console.log('✅ User created successfully:', result.user);
      
      // Now sign in the user to establish a session
      console.log('🔐 Signing in user to establish session...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (signInError) {
        console.error('❌ Sign in failed after signup:', signInError);
        return { error: signInError };
      }

      console.log('✅ User signed in successfully, session established');
      
      // Set the user role immediately to student
      setUserRole('student');

      return { error: null };
    } catch (error) {
      console.error('💥 Unexpected error during signup:', error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      } else {
        // Clear local state
        setUser(null);
        setSession(null);
        setUserRole(null);
        
        // Redirect to landing page immediately
        if (typeof window !== 'undefined') {
          // Use router.push for smoother navigation
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Sign out error:', error);
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
