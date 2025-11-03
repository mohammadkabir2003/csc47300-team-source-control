// The user profile page where you can see your account info and log out.
// Shows your email, name, and whether you're approved to sell stuff.
import { supabase, getSession, isSupabaseConfigured } from './supabase-client.js';

// Find the spot on the page where we'll show their profile details
const profileDiv = document.getElementById("profileDiv") as HTMLDivElement | null;

// Load up the user's info and display it nicely on the page
async function render(): Promise<void> {
  if (!profileDiv) {
    console.warn('[user] No #profileDiv on this page');
    return;
  }

  // Check if database is available before trying to load profile
  if (!isSupabaseConfigured) {
    profileDiv.innerHTML = `
      <div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px;">
        <strong>⚠️ Database connection unavailable</strong>
        <p>Unable to load your profile. Please check your configuration or try again later.</p>
      </div>
    `;
    return;
  }

  try {
    const session = await getSession();
    if (!session || !session.user) {
      // Nobody's logged in, send them to the login page
      profileDiv.innerHTML = '<p>No user logged in. <a href="login.html">Please log in</a>.</p>';
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
      try {
        // Sign them out and send them back to the homepage
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[user] Logout error:', error);
          alert('Failed to log out: ' + error.message);
          return;
        }
        window.location.href = 'index.html';
      } catch (err) {
        console.error('[user] Logout error:', err);
        alert('An error occurred while logging out.');
      }
    });

    profileDiv.appendChild(logoutBtn);
  } catch (err) {
    console.error('[user] Error loading profile:', err);
    profileDiv.innerHTML = `
      <div style="padding: 20px; background-color: #fee; border: 1px solid #f00; border-radius: 5px;">
        <strong>⚠️ Error loading profile</strong>
        <p>Unable to load your profile information. Please try again later.</p>
      </div>
    `;
  }
}

// Kick things off when the page loads
render();
