// The login page logic - where students sign in with their CCNY email and password.
// Everything happens through Supabase so we don't need to manage sessions ourselves.
import { supabase, isSupabaseConfigured } from './supabase-client.js';

// Find the login form and the spot where we'll show error messages
const form = document.getElementById("loginForm") as HTMLFormElement;
const errorMsg = document.getElementById("errorMsg") as HTMLParagraphElement;

// Check if Supabase is set up correctly - if not, show a clear error immediately
if (!isSupabaseConfigured) {
  errorMsg.textContent = '⚠️ Database connection error. Please check your configuration and try again later.';
  errorMsg.style.color = '#dc3545';
  form.style.opacity = '0.5';
  form.style.pointerEvents = 'none'; // Disable form interactions
}

// Listen for when they click the login button and try to sign them in
form.addEventListener("submit", async (e: Event): Promise<void> => {
  e.preventDefault(); // stop the form from actually submitting and refreshing the page
  errorMsg.textContent = ""; // clear any old error messages

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;

  // grab their input and normalize the email (lowercase, trimmed)
  const email: string = (emailInput.value || "").trim().toLowerCase();
  const password: string = passwordInput.value || "";

  // ===== Frontend Validation Errors (No DB needed) =====
  
  // Error 1: Both fields empty
  if (!email && !password) {
    errorMsg.textContent = "❌ Please enter both email and password.";
    return;
  }
  
  // Error 2: Email field is empty
  if (!email) {
    errorMsg.textContent = "❌ Please enter your email address.";
    return;
  }
  
  // Error 3: Password field is empty
  if (!password) {
    errorMsg.textContent = "❌ Please enter your password.";
    return;
  }
  
  // Error 4: Password is too short (less than 6 characters)
  if (password.length < 6) {
    errorMsg.textContent = "❌ Password must be at least 6 characters long.";
    return;
  }
  
  // Error 5: Database connection not configured
  if (!isSupabaseConfigured) {
    errorMsg.textContent = '⚠️ Database connection error. Login is currently unavailable.';
    return;
  }

  try {
    // Ask Supabase to check if their email and password match
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[login] Supabase error:', error);
      
      // Show a friendly error message based on the specific error
      // Error 9: Invalid credentials (wrong email or password from Supabase)
      if (error.message.toLowerCase().includes('invalid login') || error.message.toLowerCase().includes('invalid credentials')) {
        errorMsg.textContent = '❌ Invalid email or password. Please check your credentials and try again.';
      // Error 10: Email not confirmed
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        errorMsg.textContent = '⚠️ Please confirm your email before logging in. Check your inbox for the confirmation link.';
      // Error 11: User not found in auth system
      } else if (error.message.toLowerCase().includes('user not found') || error.message.toLowerCase().includes('no user')) {
        errorMsg.textContent = '❌ No account found with this email address. Please sign up first.';
      // Error 12: Network/connection error
      } else if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
        errorMsg.textContent = '⚠️ Unable to connect to authentication service. Please check your internet connection.';
      // Error 13: API configuration error
      } else if (error.message.toLowerCase().includes('api key') || error.message.toLowerCase().includes('anon key')) {
        errorMsg.textContent = '⚠️ Configuration error. Please contact support.';
      // Error 14: Connection timeout
      } else if (error.message.toLowerCase().includes('timeout')) {
        errorMsg.textContent = '⚠️ Connection timeout. Please try again.';
      // Error 15: Generic/unknown error
      } else {
        errorMsg.textContent = error.message || '❌ Login failed. Please try again.';
      }
      return;
    }

    // They're in! Supabase automatically creates a session and stores it for us
    const session = data.session;
    // Error 16: No session returned (rare edge case)
    if (!session) {
      errorMsg.textContent = '⚠️ Login succeeded but no session was created. Please try again.';
      return;
    }

    // Send them to the marketplace to start shopping
    window.location.href = 'market.html';
  } catch (error) {
    console.error('Login error:', error);
    // Error 17: Network fetch failure in catch block
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMsg.textContent = '⚠️ Network error. Unable to reach authentication service.';
    // Error 18: Unexpected/unknown error in catch block
    } else {
      errorMsg.textContent = '⚠️ An unexpected error occurred. Please try again later.';
    }
  }
});
