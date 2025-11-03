// The login page logic - where students sign in with their CCNY email and password.
// Everything happens through Supabase so we don't need to manage sessions ourselves.
import { supabase, isSupabaseConfigured } from './supabase-client.js';

// Find the login form
const form = document.getElementById("loginForm") as HTMLFormElement;

// Show error toast below a specific field
function showFieldError(fieldId: string, message: string): void {
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
}

// Clear all field error toasts
function clearFieldErrors(): void {
  const errorElements = document.querySelectorAll('.field-error');
  errorElements.forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

// Quick check to see if what they typed actually looks like an email address
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Check if Supabase is set up correctly - if not, disable the form
if (!isSupabaseConfigured) {
  showFieldError("email", "Database connection error");
  showFieldError("password", "Login is currently unavailable");
  form.style.opacity = '0.5';
  form.style.pointerEvents = 'none'; // Disable form interactions
}

// Listen for when they click the login button and try to sign them in
form.addEventListener("submit", async (e: Event): Promise<void> => {
  e.preventDefault(); // stop the form from actually submitting and refreshing the page
  clearFieldErrors(); // clear all field-level error toasts

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;

  // grab their input and normalize the email (lowercase, trimmed)
  const email: string = (emailInput.value || "").trim().toLowerCase();
  const password: string = passwordInput.value || "";

  // ===== Collect ALL validation errors at once =====
  
  // Error 1: Email field is empty
  if (!email) {
    showFieldError("email", "Please enter your email address");
  } else if (!validateEmail(email)) {
    // Error 2: Invalid email format
    showFieldError("email", "Please enter a valid email address");
  }
  
  // Error 3: Password field is empty
  if (!password) {
    showFieldError("password", "Please enter your password");
  } else if (password.length < 6) {
    // Error 4: Password is too short (less than 6 characters)
    showFieldError("password", "Password must be at least 6 characters long");
  }

  // Check if any field errors were shown
  const hasFieldErrors = document.querySelector('.field-error.show') !== null;
  if (hasFieldErrors) {
    return;
  }
  
  // Error 5: Database connection not configured
  if (!isSupabaseConfigured) {
    showFieldError("email", "Database connection error");
    showFieldError("password", "Login is currently unavailable");
    return;
  }

  try {
    // Ask Supabase to check if their email and password match
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[login] Supabase error:', error);
      
      // Show a friendly error message based on the specific error
      // Error 6: Invalid credentials (wrong email or password from Supabase)
      if (error.message.toLowerCase().includes('invalid login') || error.message.toLowerCase().includes('invalid credentials')) {
        // Show error only on email field (top one) since it's a combined issue
        showFieldError("email", "Invalid email or password");
      // Error 7: Email not confirmed
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        showFieldError("email", "Please confirm your email first");
        showFieldError("password", "Check your inbox for confirmation link");
      // Error 8: User not found in auth system
      } else if (error.message.toLowerCase().includes('user not found') || error.message.toLowerCase().includes('no user')) {
        showFieldError("email", "No account found with this email address");
      // Error 9: Network/connection error
      } else if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
        showFieldError("email", "Network error - check your connection");
        showFieldError("password", "Unable to connect to server");
      // Error 10: API configuration error
      } else if (error.message.toLowerCase().includes('api key') || error.message.toLowerCase().includes('anon key')) {
        showFieldError("email", "Configuration error");
        showFieldError("password", "Please contact support");
      // Error 11: Connection timeout
      } else if (error.message.toLowerCase().includes('timeout')) {
        showFieldError("email", "Connection timeout");
        showFieldError("password", "Please try again");
      // Error 12: Generic/unknown error
      } else {
        showFieldError("email", "Login failed");
        showFieldError("password", error.message || "Please try again");
      }
      return;
    }

    // They're in! Supabase automatically creates a session and stores it for us
    const session = data.session;
    // Error 13: No session returned (rare edge case)
    if (!session) {
      showFieldError("email", "Login succeeded but session failed");
      showFieldError("password", "Please try logging in again");
      return;
    }

    // Send them to the marketplace to start shopping
    window.location.href = 'market.html';
  } catch (error) {
    console.error('Login error:', error);
    // Error 14: Network fetch failure in catch block
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showFieldError("email", "Network error");
      showFieldError("password", "Unable to reach authentication service");
    // Error 15: Unexpected/unknown error in catch block
    } else {
      showFieldError("email", "Unexpected error occurred");
      showFieldError("password", "Please try again later");
    }
  }
});
