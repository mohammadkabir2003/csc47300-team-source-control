// The page you land on after clicking the reset link in your email.
// Here you can choose a new password and get back into your account.
import { supabase, isSupabaseConfigured } from './supabase-client.js';

const form = document.getElementById('updateForm') as HTMLFormElement;
const errorMsg = document.getElementById('errorMsg') as HTMLParagraphElement;
const successMsg = document.getElementById('successMsg') as HTMLParagraphElement;

// If database isn't available, disable the form and show a warning
if (!isSupabaseConfigured) {
  errorMsg.textContent = '⚠️ Database connection error. Password update is currently unavailable.';
  errorMsg.style.color = '#dc3545';
  form.style.opacity = '0.5';
  form.style.pointerEvents = 'none';
}

form.addEventListener('submit', async (e: Event): Promise<void> => {
  e.preventDefault();
  
  // Clear out old error/success messages
  errorMsg.textContent = '';
  successMsg.textContent = '';

  // Double-check that database is available
  if (!isSupabaseConfigured) {
    errorMsg.textContent = '⚠️ Database connection error. Password update is currently unavailable.';
    return;
  }

  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;
  
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  // Make sure they typed a decent password and didn't mess up retyping it
  if (!password || password.length < 6) {
    errorMsg.textContent = 'Password must be at least 6 characters.';
    return;
  }

  if (password !== confirm) {
    errorMsg.textContent = 'Passwords do not match.';
    return;
  }

  try {
    // Save the new password to their account
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error('[update-password] Supabase error:', error);
      // Provide helpful error messages based on what went wrong
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        errorMsg.textContent = '⚠️ Network error. Unable to update password. Please check your connection.';
      } else if (error.message?.includes('session')) {
        errorMsg.textContent = '⚠️ Your reset link may have expired. Please request a new one.';
      } else {
        errorMsg.textContent = error.message || 'Failed to update password.';
      }
      return;
    }

    // All set! Give them a moment to see the success message then send them to login
    successMsg.textContent = 'Password updated successfully! Redirecting to login...';
    
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (err) {
    console.error('[update-password] Password update error:', err);
    // Handle network errors specifically
    if (err instanceof TypeError && err.message.includes('fetch')) {
      errorMsg.textContent = '⚠️ Network error. Unable to reach authentication service.';
    } else {
      errorMsg.textContent = 'An unexpected error occurred. Please try again later.';
    }
  }
});
