// The login page logic - where students sign in with their CCNY email and password.
// Everything happens through Supabase so we don't need to manage sessions ourselves.
import { supabase } from './supabase-client.js';

// Find the login form and the spot where we'll show error messages
const form = document.getElementById("loginForm") as HTMLFormElement;
const errorMsg = document.getElementById("errorMsg") as HTMLParagraphElement;

// Listen for when they click the login button and try to sign them in
form.addEventListener("submit", async (e: Event): Promise<void> => {
  e.preventDefault(); // stop the form from actually submitting and refreshing the page
  errorMsg.textContent = ""; // clear any old error messages

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;

  // grab their input and normalize the email (lowercase, trimmed)
  const email: string = (emailInput.value || "").trim().toLowerCase();
  const password: string = passwordInput.value || "";

  // basic validation - make sure they filled out both fields
  if (!email || !password) {
    errorMsg.textContent = "Please enter email and password.";
    return;
  }

  try {
    // Ask Supabase to check if their email and password match
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Show a friendly error message instead of the raw technical ones
      if (error.message.toLowerCase().includes('invalid login')) {
        errorMsg.textContent = 'Invalid email or password';
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        errorMsg.textContent = 'Please confirm your email, then try again.';
      } else {
        errorMsg.textContent = error.message || 'Login failed.';
      }
      return;
    }

    // They're in! Supabase automatically creates a session and stores it for us
    const session = data.session;
    if (!session) {
      errorMsg.textContent = 'Login succeeded but no session returned. Try again.';
      return;
    }

    // Send them to the marketplace to start shopping
    window.location.href = 'market.html';
  } catch (error) {
    console.error('Login error:', error);
    errorMsg.textContent = 'An error occurred. Please try again.';
  }
});
