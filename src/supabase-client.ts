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

if (
  !SUPABASE_URL.startsWith('https://') ||
  SUPABASE_URL.includes('YOUR-PROJECT-REF') ||
  SUPABASE_ANON_KEY.includes('YOUR_PUBLIC_ANON_KEY')
) {
  // gentle reminder for local dev so it's obvious what to do
  console.warn('[supabase] Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
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
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[supabase] getSession error:', error.message);
    return null;
  }
  return data.session ?? null;
}

// subscribe to auth state changes; returns an unsubscribe function
export function onAuthStateChange(cb: (e: AuthChangeEvent, s: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => cb(event, session)
  );
  return () => data.subscription.unsubscribe();
}
