'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDBPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      addResult('🔍 Testing database connection...');

      // Test 1: Basic connection
      const { data: users, error: selectError } = await supabase
        .from('users')
        .select('*')
        .limit(5);

      if (selectError) {
        addResult(`❌ Select error: ${selectError.message}`);
        addResult(`🔍 Error details: ${JSON.stringify(selectError, null, 2)}`);
      } else {
        addResult(`✅ Select successful. Found ${users?.length || 0} users`);
        if (users && users.length > 0) {
          addResult(`📊 Sample user: ${JSON.stringify(users[0], null, 2)}`);
        }
      }

      // Test 2: Check table structure
      addResult('🔍 Checking table structure...');
      const { error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(0);

      if (tableError) {
        addResult(`❌ Table structure error: ${tableError.message}`);
      } else {
        addResult('✅ Table structure check passed');
      }

      // Test 3: Test insert (this will fail due to RLS, but shows connection works)
      addResult('🔍 Testing insert operation...');
      const testUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert([testUser]);

      if (insertError) {
        addResult(`ℹ️ Insert test failed (expected): ${insertError.message}`);
        addResult(
          `🔍 Insert error details: ${JSON.stringify(insertError, null, 2)}`
        );
      } else {
        addResult('✅ Insert test passed (unexpected!)');
      }

      // Test 4: Check current auth user
      addResult('🔍 Checking current auth user...');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        addResult(`✅ Auth user found: ${user.email} (ID: ${user.id})`);
      } else {
        addResult('ℹ️ No authenticated user found');
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
          Database Connection Test
        </h1>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">
            Test Database Connection
          </h2>
          <p className="mb-4 text-gray-600">
            This page will test the connection to your Supabase database and
            help identify any issues.
          </p>

          <div className="flex gap-4">
            <button
              onClick={testDatabaseConnection}
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Tests'}
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
