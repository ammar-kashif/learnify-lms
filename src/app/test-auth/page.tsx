'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestAuthPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testAuthAndInsert = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      addResult('🔍 Testing authentication and user insertion...');

      // Test 1: Check current auth state
      addResult('1️⃣ Checking current auth state...');
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        addResult(`❌ Get user error: ${userError.message}`);
      } else if (user) {
        addResult(`✅ User authenticated: ${user.email} (ID: ${user.id})`);
        addResult(
          `📊 User metadata: ${JSON.stringify(user.user_metadata, null, 2)}`
        );
      } else {
        addResult('ℹ️ No authenticated user found');
      }

      // Test 2: Check current session
      addResult('\n2️⃣ Checking current session...');
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        addResult(`❌ Get session error: ${sessionError.message}`);
      } else if (session) {
        addResult(`✅ Session active: ${session.user.email}`);
        addResult(`🔑 Session user ID: ${session.user.id}`);
        addResult(
          `⏰ Session expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`
        );
      } else {
        addResult('ℹ️ No active session found');
      }

      // Test 3: Try to insert a test user profile
      if (user) {
        addResult('\n3️⃣ Testing user profile insertion...');

        const testProfile = {
          id: user.id,
          email: user.email!,
          full_name: 'Test Profile User',
          role: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        addResult(
          `📋 Attempting to insert profile: ${JSON.stringify(testProfile, null, 2)}`
        );

        const { error: insertError, data: insertData } = await supabase
          .from('users')
          .insert([testProfile])
          .select();

        if (insertError) {
          addResult(`❌ Profile insertion failed: ${insertError.message}`);
          addResult(
            `🔍 Error details: ${JSON.stringify(insertError, null, 2)}`
          );

          // Check if it's an RLS policy violation
          if (insertError.code === '42501') {
            addResult('🚫 This is an RLS policy violation!');
            addResult('💡 The policy is blocking the insert operation');
          }
        } else {
          addResult(
            `✅ Profile insertion successful: ${JSON.stringify(insertData, null, 2)}`
          );
        }
      } else {
        addResult('\n3️⃣ Skipping profile insertion - no authenticated user');
      }

      // Test 4: Check if user profile already exists
      if (user) {
        addResult('\n4️⃣ Checking if user profile already exists...');

        const { data: existingProfile, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (selectError && selectError.code === 'PGRST116') {
          addResult(
            'ℹ️ No existing profile found (this is expected for new users)'
          );
        } else if (selectError) {
          addResult(`❌ Profile select error: ${selectError.message}`);
        } else if (existingProfile) {
          addResult(
            `✅ Existing profile found: ${JSON.stringify(existingProfile, null, 2)}`
          );
        }
      }
    } catch (error) {
      addResult(`💥 Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          Authentication & User Insertion Test
        </h1>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">
            Test Authentication & Database Insertion
          </h2>
          <p className="mb-4 text-gray-600">
            This page will test your authentication state and try to insert a
            user profile to identify the RLS issue.
          </p>

          <div className="flex gap-4">
            <button
              onClick={testAuthAndInsert}
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Auth Test'}
            </button>

            <button
              onClick={clearResults}
              className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Clear Results
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Test Results</h2>
            <div className="max-h-96 overflow-y-auto rounded-md bg-gray-100 p-4">
              {testResults.map((result, index) => (
                <div key={index} className="mb-2 font-mono text-sm">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
