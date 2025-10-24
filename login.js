// Login handler: check localStorage users first (users created via signup),
// then fall back to data/users.json. Normalize emails and save the matched
// user to sessionStorage as `loggedInUser` (strip sensitive fields).

const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = (emailInput.value || "").trim().toLowerCase();
  const password = passwordInput.value || "";

  if (!email || !password) {
    errorMsg.textContent = "Please enter email and password.";
    return;
  }

  try {
    // 1) try localStorage users (created via signup.js)
    const rawLocal = localStorage.getItem("users");
    const localUsers = rawLocal ? JSON.parse(rawLocal) : [];

    // normalize local users' emails
    const normalizedLocal = localUsers.map((u) => ({ ...u, _lcEmail: (u.email || "").toLowerCase() }));

    let found = normalizedLocal.find((u) => u._lcEmail === email && u.password === password);

    // 2) if not found, try static data/users.json (older seed data)
    if (!found) {
      try {
        const res = await fetch("data/users.json");
        if (res && res.ok) {
          const data = await res.json();
          const fileUsers = (data && data.users) || [];
          const normalizedFile = fileUsers.map((u) => ({ ...u, _lcEmail: (u.email || "").toLowerCase() }));
          found = normalizedFile.find((u) => u._lcEmail === email && u.password === password);
        } else {
          console.warn("data/users.json fetch returned non-ok response", res && res.status);
        }
      } catch (fetchErr) {
        // Fetch may fail on some setups (file access in some browsers). Ignore and proceed with localUsers only.
        console.warn("Could not load data/users.json (falling back to localStorage):", fetchErr);
      }
    }

    if (!found) {
      errorMsg.textContent = "Invalid email or password";
      return;
    }

    // remove the helper _lcEmail and any sensitive fields before saving
    const userToStore = { ...found };
    delete userToStore._lcEmail;
    if (userToStore.password) delete userToStore.password;

    sessionStorage.setItem("loggedInUser", JSON.stringify(userToStore));
    // redirect to market page
    window.location.href = "market.html";
  } catch (error) {
    console.error("Login error:", error);
    errorMsg.textContent = "An error occurred. Please try again.";
  }
});
