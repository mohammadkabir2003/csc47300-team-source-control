// The signup page where new students create their accounts.
// We require a CCNY email address and store their info in Supabase.
import { supabase, isSupabaseConfigured } from './supabase-client.js';

// Make sure the page is fully loaded before we start grabbing form elements
document.addEventListener("DOMContentLoaded", (): void => {
  const form = document.getElementById("signupForm") as HTMLFormElement;
  const msgEl = document.getElementById("formMsg") as HTMLParagraphElement;

  // Check if Supabase is available - if not, disable the form and show an error
  if (!isSupabaseConfigured) {
    showMessage('⚠️ Database connection error. Sign up is currently unavailable. Please contact support.', 'error');
    form.style.opacity = '0.5';
    form.style.pointerEvents = 'none';
    return; // Stop here so we don't set up the form listener
  }

  // Show a message under the form - red for errors, green for success
  // Makes it obvious to the user what went wrong or that everything worked
  function showMessage(text: string, type: 'error' | 'success' = "error"): void {
    msgEl.textContent = text;
    msgEl.classList.toggle("error", type === "error");
    msgEl.classList.toggle("success", type === "success");
  }

  // Quick check to see if what they typed actually looks like an email address
  // Nothing fancy, just making sure it has an @ sign and a dot
  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // When they hit submit, we check everything looks good and then create their account
  form.addEventListener("submit", async (e: Event): Promise<void> => {
    e.preventDefault(); // don't actually submit the form
    msgEl.textContent = ""; // clear old messages
    msgEl.className = "msg"; // reset CSS classes

    const fullName = (form.fullName as HTMLInputElement).value.trim();
    const email = (form.email as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.password as HTMLInputElement).value;
    const confirm = (form.confirmPassword as HTMLInputElement).value;
    const phone = (form.phone as HTMLInputElement).value.trim();

    if (!fullName) {
      showMessage("Please enter your full name.");
      return;
    }
    // Check that full name has at least 2 words (first and last name)
    const nameParts = fullName.split(/\s+/).filter(part => part.length > 0);
    if (nameParts.length < 2) {
      showMessage("Please enter your first and last name.");
      return;
    }
    if (!email || !validateEmail(email)) {
      showMessage("Please enter a valid email address.");
      return;
    }
    if (!password) {
      showMessage("Please enter a password.");
      return;
    }
    if (password.length < 6) {
      showMessage("Password must be at least 6 characters.");
      return;
    }
    if (!confirm) {
      showMessage("Please confirm your password.");
      return;
    }
    if (password !== confirm) {
      showMessage("Passwords do not match.");
      return;
    }

    try {
      // Create their account in Supabase and store their name and phone number
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName, 
            fullName: fullName,  // Keep both versions since different parts of the code use different formats
            phone: phone || null
          }
        }
      });

      if (error) {
        // Handle different types of errors with friendly messages
        let msg = error.message || 'Sign up failed.';
        if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
          msg = '⚠️ Network error. Unable to create account. Please check your connection.';
        } else if (error.message.toLowerCase().includes('api key')) {
          msg = '⚠️ Configuration error. Please contact support.';
        } else if (error.message.toLowerCase().includes('already registered')) {
          msg = 'This email is already registered. Try logging in instead.';
        }
        console.error('[signup] Supabase error:', error);
        showMessage(msg);
        return;
      }

      // Account created! Now they need to check their email to confirm before they can log in
      showMessage('Check your email to confirm your account. Once confirmed, come back and log in.', 'success');

      // Clear out the form so they can't accidentally submit it again
      form.reset();
    } catch (err) {
      console.error('Sign up error:', err);
      // More specific error handling for network failures
      if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
        showMessage('⚠️ Network error. Unable to reach authentication service.');
      } else {
        showMessage('An unexpected error occurred. Please try again later.');
      }
    }
  });
});
