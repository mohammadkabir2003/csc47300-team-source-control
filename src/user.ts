// The user profile page where you can see your account info and log out.
// Shows your email, name, and whether you're approved to sell stuff.
import { supabase, getSession } from './supabase-client.js';

// Find the spot on the page where we'll show their profile details
const profileDiv = document.getElementById("profileDiv") as HTMLDivElement | null;

// Load up the user's info and display it nicely on the page
async function render(): Promise<void> {
  if (!profileDiv) {
    console.warn('No #profileDiv on this page');
    return;
  }

  const session = await getSession();
  if (!session || !session.user) {
    profileDiv.innerHTML = '<p>No user logged in.</p>';
    return;
  }

  // Pull out the important stuff from their account
  const email = session.user.email || '';
  const meta: any = session.user.user_metadata || {};
  const name: string = (meta.full_name || meta.fullName || '').trim() || (email.split('@')[0]);
  const canSell: string = meta.is_seller ? 'Yes' : 'No';

  // Show their profile on the page
  profileDiv.innerHTML = `
    <h2>Email: ${email}</h2>
    <h2>Name: ${name}</h2>
    <h2>Seller: ${canSell}</h2>
  `;

  // Add a logout button so they can sign out when they're done
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Logout';
  logoutBtn.className = 'btn btn-ghost';
  logoutBtn.style.marginTop = '1rem';
  logoutBtn.addEventListener('click', async (): Promise<void> => {
    // Sign them out and send them back to the homepage
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

  profileDiv.appendChild(logoutBtn);
}

render();
