// The navbar authentication UI that shows login/signup links or profile/logout based on login state.
// Listens for auth changes and updates the navbar automatically when someone logs in or out.
import { supabase, getSession } from './supabase-client.js';
import { UserMetadata } from './types.js';

// ID for the navbar element that shows logout button
const STATUS_ELEMENT_ID = 'headerUserStatus';

// wait for the page to load before messing with the navbar
document.addEventListener('DOMContentLoaded', (): void => {
  // grab the main navigation element
  const nav = document.querySelector('header .wrap nav');
  if (!nav) {
    console.warn('[auth-ui] No navigation element found');
    return; // bail out if there's no nav (shouldn't happen, but just in case)
  }

  // find the important navbar links we need to show/hide based on login state
  const links = {
    profile: nav.querySelector('a[href="user.html"]') as HTMLAnchorElement | null,
    login: nav.querySelector('a[href="login.html"]') as HTMLAnchorElement | null,
    signup: nav.querySelector('a[href="signup.html"]') as HTMLAnchorElement | null
  };

  // if there's no profile link in the HTML yet, create one and stick it in the nav
  // we put it right before the login link so the order makes sense
  if (!links.profile) {
    links.profile = createProfileLink();
    const insertPosition = nav.querySelector('a[href="login.html"]');
    if (insertPosition) {
      nav.insertBefore(links.profile, insertPosition);
    } else {
      nav.appendChild(links.profile);
    }
  }

  // grab or create the container where we'll put the logout button
  // grab or create the container where we'll put the logout button
  const statusContainer = getOrCreateStatusContainer(nav);

  // helper to make a profile link element
  function createProfileLink(): HTMLAnchorElement {
    const link = document.createElement('a');
    link.className = 'nav-link';
    link.href = 'user.html';
    link.textContent = 'Profile';
    return link;
  }

  // either grab the existing status container or make a new one
  // this is where the logout button lives
  function getOrCreateStatusContainer(parent: Element): HTMLElement {
    let container = document.getElementById(STATUS_ELEMENT_ID);
    if (!container) {
      container = document.createElement('span');
      container.id = STATUS_ELEMENT_ID;
      container.style.cssText = 'margin-left:0.6rem;display:flex;gap:0.5rem;align-items:center';
      parent.appendChild(container);
    }
    return container;
  }

  function getUserDisplayName(email: string | null, meta?: UserMetadata): string {
    // prefer a friendly name from user metadata if provided
    const full = meta?.full_name || meta?.fullName;
    if (typeof full === 'string' && full.trim()) return full.trim();
    if (email) return email.split('@')[0];
    return 'Unknown';
  }

  function showLoggedOutState(): void {
    if (links.profile) links.profile.style.display = 'none';
    if (links.login) links.login.style.display = '';
    if (links.signup) links.signup.style.display = '';
    statusContainer.innerHTML = '';
  }

  // when someone's logged in, show their name and a logout button
  // hide the login and signup links since they don't need those anymore
  function showLoggedInState(email: string, meta?: UserMetadata): void {
    const displayName = getUserDisplayName(email, meta);
    const firstName = displayName.split(' ')[0]; // just show first name in nav to save space

    if (links.profile) {
      links.profile.style.display = '';
      links.profile.title = `View profile (${displayName})`; // tooltip shows full name
      links.profile.textContent = firstName;
    }
    if (links.login) links.login.style.display = 'none';
    if (links.signup) links.signup.style.display = 'none';

    renderLogoutButton(statusContainer);
  }

  // Make a logout button and stick it in the navbar
  function renderLogoutButton(container: HTMLElement): void {
    container.innerHTML = ''; // Wipe out anything that was there before
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', handleLogout);
    container.appendChild(logoutBtn);
  }

  // When they hit logout, end their session and take them back to the homepage
  async function handleLogout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[auth-ui] Logout error:', error);
        alert('Failed to log out. Please try again.');
        return;
      }
      location.href = 'index.html';
    } catch (err) {
      console.error('[auth-ui] Logout error:', err);
      alert('An error occurred while logging out.');
    }
  }

  // Check if someone's logged in and update the navbar to match their status
  async function render(): Promise<void> {
    try {
      const session = await getSession();
      if (session && session.user) {
        const email = session.user.email || '';
        const meta = session.user.user_metadata || {};
        showLoggedInState(email, meta);
      } else {
        showLoggedOutState();
      }
    } catch (err) {
      console.error('[auth-ui] Error rendering auth state:', err);
      // If we can't determine auth state, default to logged out view
      showLoggedOutState();
    }
  }

  // Update the navbar right away when the page loads
  render();
  // Keep watching for login/logout events so the navbar always stays current
  supabase.auth.onAuthStateChange(() => { render(); });
});
