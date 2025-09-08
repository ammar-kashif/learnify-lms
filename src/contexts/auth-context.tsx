'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/postgrest-js';
import { supabase } from '@/lib/supabase';

export interface AuthContextType {
  user: User | null;
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
    fullName: string,
    role: 'student' | 'teacher' | 'superadmin'
  ) => Promise<{ error: AuthError | PostgrestError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

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
        .select('role')
        .eq('id', userId)
        .single();
      
      const { data: profile, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Error fetching user role:', error);
        return null;
      }
      
      console.log('✅ Successfully fetched user role:', profile?.role);
      return profile?.role;
    } catch (error) {
      console.error('❌ Error fetching user role:', error);
      return null;
    }
  }, []);

  // Removed unused getRoleWithFallback to satisfy linter

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role if we have a user
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        }
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
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Fetch user role if we have a user
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

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
    fullName: string,
    role: 'student' | 'teacher' | 'superadmin'
  ) => {
    try {
      console.log('🚀 Starting signup process for:', email);

      // Sign up the user
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) {
        console.error('❌ Sign up error:', signUpError);
        return { error: signUpError };
      }

      console.log('✅ Auth signup successful, user data:', data);

      // Note: User profile creation is now handled by superadmin only
      // The auth user is created but profile must be created separately by superadmin
      console.log('✅ Auth signup successful - profile must be created by superadmin');

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
    session,
    loading,
    userRole,
    signIn,
    signUp,
    signOut,
    resetPassword,
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
