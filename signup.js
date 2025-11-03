document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const msgEl = document.getElementById("formMsg");

  function showMessage(text, type = "error") {
    msgEl.textContent = text;
    msgEl.classList.toggle("error", type === "error");
    msgEl.classList.toggle("success", type === "success");
  }

  function validateEmail(email) {
    // simple email check
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msgEl.textContent = "";
    msgEl.className = "msg";

    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const confirm = form.confirmPassword.value;
    const phone = form.phone.value.trim();
    const isSeller = !!form.isSeller.checked;

    if (!fullName) return showMessage("Please enter your full name.");
    if (!email || !validateEmail(email))
      return showMessage("Please enter a valid email address.");
    if (!password || password.length < 6)
      return showMessage("Password must be at least 6 characters.");
    if (password !== confirm) return showMessage("Passwords do not match.");

    // create user object
    const user = { id: Date.now(), fullName, email, password, phone, isSeller };

    try {
      // store in localStorage as a simple placeholder for registration
      const raw = localStorage.getItem("users");
      const users = raw ? JSON.parse(raw) : [];

      // don't allow duplicate email
      if (users.some((u) => u.email === email)) {
        return showMessage(
          "An account with that email already exists. Try logging in."
        );
      }

      users.push(user);
      localStorage.setItem("users", JSON.stringify(users));

      showMessage("Account created! Redirecting to login...", "success");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1600);
    } catch (err) {
      console.error(err);
      showMessage(
        "Unable to create account locally — check browser storage settings."
      );
    }
  });
});
