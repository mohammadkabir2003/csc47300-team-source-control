// profile div
const profileDiv = document.getElementById("profileDiv");

// read loggedInUser only from sessionStorage so the profile is not auto-shown
let user = null;
try {
  user = JSON.parse(sessionStorage.getItem("loggedInUser"));
} catch (err) {
  console.warn("Failed to parse loggedInUser from sessionStorage:", err);
}

if (!profileDiv) {
  // nothing to do on pages without profileDiv
  console.warn("No #profileDiv on this page");
} else if (!user) {
  // profile div not be displayed
  profileDiv.innerHTML = "<p>No user logged in.</p>";
} else {
  // Safely render different user shapes:
  // - seed users from data/users.json usually have `student_profile` and `seller_profile`
  // - users created via signup.js have simpler shape (fullName, email, phone, isSeller)

  const email = user.email || "";

  if (user.student_profile) {
    const s = user.student_profile || {};
    const name = `${s.first_name || s.firstName || ""} ${s.last_name || s.lastName || ""}`.trim();
    const major = s.major || "—";

    profileDiv.innerHTML = `
      <h2>Email: ${email}</h2>
      <h2>Name: ${name || "Unknown"}</h2>
      <h2>Major: ${major}</h2>
    `;
  } else {
    // fallback for signup-created users
    const name = user.fullName || [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown";
    const canSell = user.isSeller ? "Yes" : "No";

    profileDiv.innerHTML = `
      <h2>Email: ${email}</h2>
      <h2>Name: ${name}</h2>
      <h2>Seller: ${canSell}</h2>
    `;
  }

  // add a logout button below the profile
  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Logout";
  logoutBtn.className = "btn btn-ghost";
  logoutBtn.style.marginTop = "1rem";
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("loggedInUser");
    // redirect to home after logout
    window.location.href = "index.html";
  });

  profileDiv.appendChild(logoutBtn);
}

// Note: logout handling removes only sessionStorage.loggedInUser so the user's signup record in localStorage (if any) remains.
