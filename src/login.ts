import { User, UsersData, UserSession } from './types.js';

const form = document.getElementById("loginForm") as HTMLFormElement;
const errorMsg = document.getElementById("errorMsg") as HTMLParagraphElement;

form.addEventListener("submit", async (e: Event): Promise<void> => {
  e.preventDefault();
  errorMsg.textContent = "";

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;

  const email: string = (emailInput.value || "").trim().toLowerCase();
  const password: string = passwordInput.value || "";

  if (!email || !password) {
    errorMsg.textContent = "Please enter email and password.";
    return;
  }

  try {
    const rawLocal = localStorage.getItem("users");
    const localUsers: User[] = rawLocal ? JSON.parse(rawLocal) : [];

    const normalizedLocal: User[] = localUsers.map((u) => ({
      ...u,
      _lcEmail: (u.email || "").toLowerCase()
    }));

    let found: User | undefined = normalizedLocal.find(
      (u) => u._lcEmail === email && u.password === password
    );

    if (!found) {
      try {
        const res = await fetch("data/users.json");
        if (res && res.ok) {
          const data: UsersData = await res.json();
          const fileUsers: User[] = (data && data.users) || [];
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
        console.warn("Could not load data/users.json (falling back to localStorage):", fetchErr);
      }
    }

    if (!found) {
      errorMsg.textContent = "Invalid email or password";
      return;
    }

    const userToStore: UserSession = { ...found };
    delete (userToStore as any)._lcEmail;
    delete (userToStore as any).password;

    sessionStorage.setItem("loggedInUser", JSON.stringify(userToStore));
    window.location.href = "market.html";
  } catch (error) {
    console.error("Login error:", error);
    errorMsg.textContent = "An error occurred. Please try again.";
  }
});
