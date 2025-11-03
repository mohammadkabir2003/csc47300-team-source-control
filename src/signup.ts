import { User, UserSession } from './types.js';

// wait for page to load before grabbing form elements
document.addEventListener("DOMContentLoaded", (): void => {
  const form = document.getElementById("signupForm") as HTMLFormElement;
  const msgEl = document.getElementById("formMsg") as HTMLParagraphElement;

  // helper to show error or success messages below the form
  // toggles CSS classes to style them red or green
  function showMessage(text: string, type: 'error' | 'success' = "error"): void {
    msgEl.textContent = text;
    msgEl.classList.toggle("error", type === "error");
    msgEl.classList.toggle("success", type === "success");
  }

  // simple email validation using regex
  // just checks that it looks like an email (has @ and a dot)
  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // when they submit the signup form, validate everything and create their account
  form.addEventListener("submit", (e: Event): void => {
    e.preventDefault(); // don't actually submit the form
    msgEl.textContent = ""; // clear old messages
    msgEl.className = "msg"; // reset CSS classes

    const fullName = (form.fullName as HTMLInputElement).value.trim();
    const email = (form.email as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.password as HTMLInputElement).value;
    const confirm = (form.confirmPassword as HTMLInputElement).value;
    const phone = (form.phone as HTMLInputElement).value.trim();
    const isSeller = !!(form.isSeller as HTMLInputElement).checked;

    if (!fullName) {
      showMessage("Please enter your full name.");
      return;
    }
    if (!email || !validateEmail(email)) {
      showMessage("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      showMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showMessage("Passwords do not match.");
      return;
    }

    // all validation passed, create the user object
    // use timestamp as a simple unique ID
    const user: User = {
      id: Date.now(),
      fullName,
      email,
      password,
      phone,
      isSeller
    };

    try {
      // grab existing users from localStorage (or empty array if none exist)
      const raw = localStorage.getItem("users");
      const users: User[] = raw ? JSON.parse(raw) : [];

      // check if someone already has this email
      // can't have duplicate accounts
      if (users.some((u) => u.email === email)) {
        showMessage("An account with that email already exists. Try logging in.");
        return;
      }

      // add the new user to the array and save it back
      users.push(user);
      localStorage.setItem("users", JSON.stringify(users));

      // also log them in immediately by putting them in sessionStorage
      // but first remove the password field (security!)
      const sessionUser: UserSession = { ...user };
      delete (sessionUser as any).password;
      sessionStorage.setItem("loggedInUser", JSON.stringify(sessionUser));

      // show success message
      showMessage("Account created! Redirecting to your profile...", "success");

      // wait a second so they can see the success message, then redirect
      setTimeout((): void => {
        window.location.href = "user.html";
      }, 900);
    } catch (err) {
      // catch any localStorage errors (quota exceeded, disabled, etc)
      console.error(err);
      showMessage("Unable to create account locally — check browser storage settings.");
    }
  });
});
