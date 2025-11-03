import { User, UsersData, UserSession } from './types.js';

// grab the form and error message elements
const form = document.getElementById("loginForm") as HTMLFormElement;
const errorMsg = document.getElementById("errorMsg") as HTMLParagraphElement;

// when they submit the login form, check their credentials
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
    // first, check localStorage for accounts created through signup
    // these are users who signed up on the site
    // first, check localStorage for accounts created through signup
    // these are users who signed up on the site
    const rawLocal = localStorage.getItem("users");
    const localUsers: User[] = rawLocal ? JSON.parse(rawLocal) : [];

    // normalize all emails to lowercase so we can compare case-insensitively
    // add a temporary _lcEmail field for easier matching
    const normalizedLocal: User[] = localUsers.map((u) => ({
      ...u,
      _lcEmail: (u.email || "").toLowerCase()
    }));

    // try to find a matching user in localStorage first
    let found: User | undefined = normalizedLocal.find(
      (u) => u._lcEmail === email && u.password === password
    );

    // if we didn't find them in localStorage, check the seed users from users.json
    // these are pre-made accounts for testing
    if (!found) {
      try {
        const res = await fetch("data/users.json");
        if (res && res.ok) {
          const data: UsersData = await res.json();
          const fileUsers: User[] = (data && data.users) || [];
          // normalize these emails too
          const normalizedFile: User[] = fileUsers.map((u) => ({
            ...u,
            _lcEmail: (u.email || "").toLowerCase()
          }));
          found = normalizedFile.find(
            (u) => u._lcEmail === email && u.password === password
          );
        } else {
          console.warn("data/users.json fetch returned non-ok response", res && res.status);
        }
      } catch (fetchErr) {
        // if the file doesn't exist or we can't load it, that's okay
        // just stick with localStorage users only
        console.warn("Could not load data/users.json (falling back to localStorage):", fetchErr);
      }
    }

    // if we still didn't find them anywhere, their credentials are wrong
    if (!found) {
      errorMsg.textContent = "Invalid email or password";
      return;
    }

    // found them! now we need to clean up the user object before storing it
    const userToStore: UserSession = { ...found };
    delete (userToStore as any)._lcEmail; // remove our temporary comparison field
    delete (userToStore as any).password; // NEVER store passwords in sessionStorage

    // save to sessionStorage so they stay logged in while browsing
    // sessionStorage clears when they close the browser tab, which is what we want for security
    sessionStorage.setItem("loggedInUser", JSON.stringify(userToStore));
    
    // send them to the marketplace now that they're logged in
    window.location.href = "market.html";
  } catch (error) {
    // catch any unexpected errors (network issues, JSON parsing fails, etc)
    console.error("Login error:", error);
    errorMsg.textContent = "An error occurred. Please try again.";
  }
});
