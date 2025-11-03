import { UserSession, StudentProfile } from './types.js';

const profileDiv = document.getElementById("profileDiv") as HTMLDivElement | null;

let user: UserSession | null = null;
try {
  const raw = sessionStorage.getItem("loggedInUser");
  if (raw) {
    user = JSON.parse(raw) as UserSession;
  }
} catch (err) {
  console.warn("Failed to parse loggedInUser from sessionStorage:", err);
}

if (!profileDiv) {
  console.warn("No #profileDiv on this page");
} else if (!user) {
  profileDiv.innerHTML = "<p>No user logged in.</p>";
} else {
  const email: string = user.email || "";

  if (user.student_profile) {
    const s: StudentProfile = user.student_profile || {};
    const name: string = `${s.first_name || s.firstName || ""} ${s.last_name || s.lastName || ""}`.trim();
    const major: string = s.major || "—";

    profileDiv.innerHTML = `
      <h2>Email: ${email}</h2>
      <h2>Name: ${name || "Unknown"}</h2>
      <h2>Major: ${major}</h2>
    `;
  } else {
    const name: string = user.fullName || 
      [user.first_name, user.last_name].filter(Boolean).join(" ") || 
      "Unknown";
    const canSell: string = user.isSeller ? "Yes" : "No";

    profileDiv.innerHTML = `
      <h2>Email: ${email}</h2>
      <h2>Name: ${name}</h2>
      <h2>Seller: ${canSell}</h2>
    `;
  }

  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Logout";
  logoutBtn.className = "btn btn-ghost";
  logoutBtn.style.marginTop = "1rem";
  logoutBtn.addEventListener("click", (): void => {
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  profileDiv.appendChild(logoutBtn);
}
