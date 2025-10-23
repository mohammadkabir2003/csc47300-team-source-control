// get all users from data/users.json
// check if typed in credentials match any existing .email and .password
// redirect to market.html if successful, else show error message in p tag

// need form, and need errorMsg ptag

const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("data/users.json");

    if (!res.ok) {
      throw new Error("Failed to fetch users");
    }

    const data = await res.json();
    const users = data.users;

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      errorMsg.textContent = "Invalid email or password";
      return;
    }

    // save user data to session local storage
    localStorage.setItem("loggedInUser", JSON.stringify(user));
    window.location.href = "market.html";
    // /login.html -> /market.html
  } catch (error) {
    console.error("Login error:", error);
    errorMsg.textContent = "An error occurred. Please try again.";
  }
});