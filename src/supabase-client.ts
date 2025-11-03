// tiny wrapper around Supabase client used across the app
// contract
// - inputs: static project URL and anon public key (paste yours below)
// - outputs: a configured supabase client, getSession() helper, and auth state listener
// - error modes: if keys are placeholders or missing, we log a clear console warning

import { createClient, type Session, type AuthChangeEvent } from '@supabase/supabase-js';

// runtime-config pattern for static sites: read keys from a non-committed env.js
// env.js should define: window.__ENV__ = { SUPABASE_URL: '...', SUPABASE_ANON_KEY: '...', SUPABASE_SERVICE_ROLE_KEY: '...' }
declare global {
  interface Window {
    __ENV__?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
  }
}

// Prefer runtime config from env.js; fall back to placeholders (with warning)
const SUPABASE_URL = (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) || 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_ANON_KEY) || 'YOUR_PUBLIC_ANON_KEY';
const SUPABASE_SERVICE_ROLE_KEY = (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_SERVICE_ROLE_KEY) || '';

// Check if Supabase credentials are properly configured
// This flag tells us if the app can actually talk to the database
export const isSupabaseConfigured = 
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_ANON_KEY.includes('YOUR_PUBLIC_ANON_KEY') &&
  SUPABASE_ANON_KEY.length > 20;

if (!isSupabaseConfigured) {
  // Loud warning so developers know something's wrong with their setup
  console.error('[supabase] ❌ CONFIGURATION ERROR: Missing or invalid Supabase credentials!');
  console.error('[supabase] Please check your .env file and make sure SUPABASE_URL and SUPABASE_ANON_KEY are set correctly.');
  console.error('[supabase] Current URL:', SUPABASE_URL);
  console.error('[supabase] Key status:', SUPABASE_ANON_KEY.includes('YOUR_PUBLIC') ? 'PLACEHOLDER' : 'SET');
}

// Regular client for public operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client for server-side operations (can access auth.users)
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// get the current auth session
export async function getSession(): Promise<Session | null> {
  // If Supabase isn't configured, we can't get a session
  if (!isSupabaseConfigured) {
    console.error('[supabase] Cannot get session - Supabase is not configured');
    return null;
  }
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[supabase] getSession error:', error.message);
      return null;
    }
    return data.session ?? null;
  } catch (err) {
    console.error('[supabase] Network error getting session:', err);
    return null;
  }
}

// subscribe to auth state changes; returns an unsubscribe function
export function onAuthStateChange(cb: (e: AuthChangeEvent, s: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => cb(event, session)
  );
  return () => data.subscription.unsubscribe();
}
