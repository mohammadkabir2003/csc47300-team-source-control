import { User, UserSession } from './types.js';

document.addEventListener("DOMContentLoaded", (): void => {
  const form = document.getElementById("signupForm") as HTMLFormElement;
  const msgEl = document.getElementById("formMsg") as HTMLParagraphElement;

  function showMessage(text: string, type: 'error' | 'success' = "error"): void {
    msgEl.textContent = text;
    msgEl.classList.toggle("error", type === "error");
    msgEl.classList.toggle("success", type === "success");
  }

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  form.addEventListener("submit", (e: Event): void => {
    e.preventDefault();
    msgEl.textContent = "";
    msgEl.className = "msg";

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

    const user: User = {
      id: Date.now(),
      fullName,
      email,
      password,
      phone,
      isSeller
    };

    try {
      const raw = localStorage.getItem("users");
      const users: User[] = raw ? JSON.parse(raw) : [];

      if (users.some((u) => u.email === email)) {
        showMessage("An account with that email already exists. Try logging in.");
        return;
      }

      users.push(user);
      localStorage.setItem("users", JSON.stringify(users));

      const sessionUser: UserSession = { ...user };
      delete (sessionUser as any).password;
      sessionStorage.setItem("loggedInUser", JSON.stringify(sessionUser));

      showMessage("Account created! Redirecting to your profile...", "success");

      setTimeout((): void => {
        window.location.href = "user.html";
      }, 900);
    } catch (err) {
      console.error(err);
      showMessage("Unable to create account locally — check browser storage settings.");
    }
  });
});
