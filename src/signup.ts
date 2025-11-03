// The signup page where new students create their accounts.
// We require a CCNY email address and store their info in Supabase.
import { supabase, isSupabaseConfigured } from './supabase-client.js';

// Format phone number as user types: (555) 123-4567
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

// Make sure the page is fully loaded before we start grabbing form elements
document.addEventListener("DOMContentLoaded", (): void => {
  const form = document.getElementById("signupForm") as HTMLFormElement;
  const msgEl = document.getElementById("formMsg") as HTMLParagraphElement;
  const phoneInput = document.getElementById("phone") as HTMLInputElement;

  // Add phone number formatting
  if (phoneInput) {
    phoneInput.addEventListener('input', (e: Event): void => {
      const target = e.target as HTMLInputElement;
      const cursorPosition = target.selectionStart || 0;
      const oldLength = target.value.length;
      
      target.value = formatPhoneNumber(target.value);
      
      // Adjust cursor position after formatting
      const newLength = target.value.length;
      if (oldLength !== newLength) {
        const newPosition = cursorPosition + (newLength - oldLength);
        target.setSelectionRange(newPosition, newPosition);
      }
    });
  }

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
    // If text contains multiple lines (from multiple errors), format them as a list
    if (text.includes('\n')) {
      const lines = text.split('\n').filter(line => line.trim());
      msgEl.innerHTML = lines.map(line => `<div>${line}</div>`).join('');
    } else {
      msgEl.textContent = text;
    }
    msgEl.classList.toggle("error", type === "error");
    msgEl.classList.toggle("success", type === "success");
  }

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
  // Nothing fancy, just making sure it has an @ sign and a dot
  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // When they hit submit, we check everything looks good and then create their account
  form.addEventListener("submit", async (e: Event): Promise<void> => {
    e.preventDefault(); // don't actually submit the form
    msgEl.textContent = ""; // clear old messages
    msgEl.className = "msg"; // reset CSS classes
    clearFieldErrors(); // clear all field-level error toasts

    const fullName = (form.fullName as HTMLInputElement).value.trim();
    const email = (form.email as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.password as HTMLInputElement).value;
    const confirm = (form.confirmPassword as HTMLInputElement).value;
    const phone = (form.phone as HTMLInputElement).value.trim();
    const isSeller = (form.isSeller as HTMLInputElement).checked;

    // Collect ALL validation errors and show them next to each field
    let hasErrors = false;

    if (!fullName) {
      showFieldError("fullName", "Please enter your full name");
      hasErrors = true;
    } else {
      // Check that full name has at least 2 words (first and last name)
      const nameParts = fullName.split(/\s+/).filter(part => part.length > 0);
      if (nameParts.length < 2) {
        showFieldError("fullName", "Please enter your first and last name");
        hasErrors = true;
      }
    }

    if (!email) {
      showFieldError("email", "Please enter an email address");
      hasErrors = true;
    } else if (!validateEmail(email)) {
      showFieldError("email", "Please enter a valid email address");
      hasErrors = true;
    }

    if (!password) {
      showFieldError("password", "Please enter a password");
      hasErrors = true;
    } else if (password.length < 6) {
      showFieldError("password", "Password must be at least 6 characters");
      hasErrors = true;
    }

    if (!confirm) {
      showFieldError("confirmPassword", "Please confirm your password");
      hasErrors = true;
    } else if (password && confirm && password !== confirm) {
      showFieldError("confirmPassword", "Passwords do not match");
      hasErrors = true;
    }

    // If there are any errors, stop here
    if (hasErrors) {
      return;
    }

    try {
      // Create their account in Supabase and store their name, phone, and seller status
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName, 
            fullName: fullName,  // Keep both versions since different parts of the code use different formats
            phone: phone || null,
            is_seller: isSeller  // Store seller status - triggers will save to user_profiles table
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
