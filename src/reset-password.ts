// The forgot password page - when you can't remember your password, we email you a reset link.
// Just enter your email and check your inbox for instructions.
import { supabase } from './supabase-client.js';

const form = document.getElementById('resetForm') as HTMLFormElement;
const errorMsg = document.getElementById('errorMsg') as HTMLParagraphElement;
const successMsg = document.getElementById('successMsg') as HTMLParagraphElement;

form.addEventListener('submit', async (e: Event): Promise<void> => {
  e.preventDefault();
  
  // Get rid of any old messages before showing new ones
  errorMsg.textContent = '';
  successMsg.textContent = '';

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
      errorMsg.textContent = error.message || 'Failed to send reset email.';
      return;
    }

    // We don't say whether the account exists for security reasons - just tell them to check email
    successMsg.textContent = "If an account with that email exists, you'll receive a password reset link.";
    form.reset();
  } catch (err) {
    console.error('Password reset error:', err);
    errorMsg.textContent = 'An unexpected error occurred. Please try again.';
  }
});
