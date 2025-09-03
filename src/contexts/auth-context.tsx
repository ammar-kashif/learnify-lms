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
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const fetchPromise = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      const { data: profile, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      console.log('🔍 Fetched user role from profile:', profile.role);
      return profile.role;
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Return null to indicate we couldn't fetch the role
      return null;
    }
  }, []);

  // Function to get role with fallback
  const getRoleWithFallback = useCallback(async (userId: string, userMetadata: any) => {
    try {
      const profileRole = await fetchUserRole(userId);
      if (profileRole) {
        return profileRole;
      }
      // Fallback to metadata role
      console.log('Using fallback role from metadata:', userMetadata?.role);
      return userMetadata?.role || 'student';
    } catch (error) {
      console.error('Error getting role with fallback:', error);
      return null;
    }
  }, [fetchUserRole]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Add timeout protection
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role if we have a user
        if (session?.user) {
          const role = await getRoleWithFallback(session.user.id, session.user.user_metadata);
          setUserRole(role);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Set loading to false even if there's an error
        setLoading(false);
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
        const role = await getRoleWithFallback(session.user.id, session.user.user_metadata);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [getRoleWithFallback]);

  const signIn = async (email: string, password: string) => {
    try {
      // Add timeout protection for the entire signin process
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout')), 15000)
      );
      
      const signInPromise = (async () => {
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
              // Profile doesn't exist, create it
              console.log('📝 User profile not found, creating one...');

              const userProfile = {
                id: data.user.id,
                email: data.user.email!,
                full_name: data.user.user_metadata?.full_name || 'Unknown User',
                role: data.user.user_metadata?.role || 'student',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { error: createError } = await supabase
                .from('users')
                .insert([userProfile]);

              if (createError) {
                console.error(
                  '❌ Failed to create user profile during signin:',
                  createError
                );
              } else {
                console.log('✅ User profile created during signin');
              }
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
      })();

      return await Promise.race([signInPromise, timeoutPromise]) as any;
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

      // If signup is successful and we have a user, create the user profile
      if (data.user) {
        console.log('📝 Creating user profile for ID:', data.user.id);

        // Wait a moment to ensure the auth session is established
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the current session to ensure we're authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log('🔐 Current session:', session);

        if (!session) {
          console.warn(
            '⚠️ No active session found, user may need to confirm email'
          );
          // For email confirmation flow, we'll create the profile later
          return { error: null };
        }

        const userProfile = {
          id: session.user.id, // Use session.user.id to match auth.uid() for RLS
          email: data.user.email!,
          full_name: fullName,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('📋 User profile data to insert:', userProfile);
        console.log('🔑 Current auth.uid():', session.user.id);
        console.log(
          '🔍 Profile ID matches auth.uid():',
          userProfile.id === session.user.id
        );

        console.log('🚀 Attempting to insert profile into users table...');
        console.log('📊 Profile data:', JSON.stringify(userProfile, null, 2));

        const { error: profileError, data: profileData } = await supabase
          .from('users')
          .insert([userProfile])
          .select();

        if (profileError) {
          console.error('❌ Profile creation error:', profileError);
          console.error('🔍 Error details:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code,
          });

          // If it's an RLS policy violation, provide specific guidance
          if (profileError.code === '42501') {
            console.error(
              '🚫 RLS Policy Violation - User might not be properly authenticated'
            );
            console.error(
              '💡 Try signing in first, then the profile will be created automatically'
            );
          }

          // Return the profile creation error so user knows something went wrong
          return { error: profileError };
        }

        console.log('✅ User profile created successfully:', profileData);
        console.log('📋 Inserted data:', JSON.stringify(profileData, null, 2));
      } else {
        console.warn('⚠️ No user data returned from signup');
      }

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
