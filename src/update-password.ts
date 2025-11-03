// The page you land on after clicking the reset link in your email.
// Here you can choose a new password and get back into your account.
import { supabase } from './supabase-client.js';

const form = document.getElementById('updateForm') as HTMLFormElement;
const errorMsg = document.getElementById('errorMsg') as HTMLParagraphElement;
const successMsg = document.getElementById('successMsg') as HTMLParagraphElement;

form.addEventListener('submit', async (e: Event): Promise<void> => {
  e.preventDefault();
  
  // Clear out old error/success messages
  errorMsg.textContent = '';
  successMsg.textContent = '';

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
      errorMsg.textContent = error.message || 'Failed to update password.';
      return;
    }

    // All set! Give them a moment to see the success message then send them to login
    successMsg.textContent = 'Password updated successfully! Redirecting to login...';
    
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (err) {
    console.error('Password update error:', err);
    errorMsg.textContent = 'An unexpected error occurred. Please try again.';
  }
});
