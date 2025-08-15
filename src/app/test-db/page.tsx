'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDBPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
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
      const { data: tableInfo, error: tableError } = await supabase
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
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert([testUser]);

      if (insertError) {
        addResult(`ℹ️ Insert test failed (expected): ${insertError.message}`);
        addResult(`🔍 Insert error details: ${JSON.stringify(insertError, null, 2)}`);
      } else {
        addResult('✅ Insert test passed (unexpected!)');
      }

      // Test 4: Check current auth user
      addResult('🔍 Checking current auth user...');
      const { data: { user } } = await supabase.auth.getUser();
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Database Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Database Connection</h2>
          <p className="text-gray-600 mb-4">
            This page will test the connection to your Supabase database and help identify any issues.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={testDatabaseConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Tests'}
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear Results
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="bg-gray-100 rounded-md p-4 max-h-96 overflow-y-auto">
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
