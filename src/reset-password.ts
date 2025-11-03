// The forgot password page - when you can't remember your password, we email you a reset link.
// Just enter your email and check your inbox for instructions.
import { supabase, isSupabaseConfigured } from './supabase-client.js';

const form = document.getElementById('resetForm') as HTMLFormElement;
const errorMsg = document.getElementById('errorMsg') as HTMLParagraphElement;
const successMsg = document.getElementById('successMsg') as HTMLParagraphElement;

// If database isn't available, disable the form and show a warning
if (!isSupabaseConfigured) {
  errorMsg.textContent = '⚠️ Database connection error. Password reset is currently unavailable.';
  errorMsg.style.color = '#dc3545';
  form.style.opacity = '0.5';
  form.style.pointerEvents = 'none';
}

form.addEventListener('submit', async (e: Event): Promise<void> => {
  e.preventDefault();
  
  // Get rid of any old messages before showing new ones
  errorMsg.textContent = '';
  successMsg.textContent = '';

  // Double-check that database is available
  if (!isSupabaseConfigured) {
    errorMsg.textContent = '⚠️ Database connection error. Password reset is currently unavailable.';
    return;
  }

  const emailInput = document.getElementById('email') as HTMLInputElement;
  const email = emailInput.value.trim().toLowerCase();

  if (!email) {
    errorMsg.textContent = 'Please enter your email address.';
    return;
  }

  try {
    // Ask Supabase to send them a password reset email with a special link
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password.html`
    });

    if (error) {
      console.error('[reset-password] Supabase error:', error);
      // Provide helpful error messages based on what went wrong
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        errorMsg.textContent = '⚠️ Network error. Unable to send reset email. Please check your connection.';
      } else {
        errorMsg.textContent = error.message || 'Failed to send reset email.';
      }
      return;
    }

    // We don't say whether the account exists for security reasons - just tell them to check email
    successMsg.textContent = "If an account with that email exists, you'll receive a password reset link.";
    form.reset();
  } catch (err) {
    console.error('[reset-password] Password reset error:', err);
    // Handle network errors specifically
    if (err instanceof TypeError && err.message.includes('fetch')) {
      errorMsg.textContent = '⚠️ Network error. Unable to reach authentication service.';
    } else {
      errorMsg.textContent = 'An unexpected error occurred. Please try again later.';
    }
  }
});
