import { UserSession } from './types.js';

// where we store the logged-in user in sessionStorage
const STORAGE_KEY = 'loggedInUser';
// ID for the navbar element that shows logout button
const STATUS_ELEMENT_ID = 'headerUserStatus';

// wait for the page to load before messing with the navbar
document.addEventListener('DOMContentLoaded', (): void => {
  // grab the main navigation element
  const nav = document.querySelector('header .wrap nav');
  if (!nav) return; // bail out if there's no nav (shouldn't happen, but just in case)

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

  // check if there's a user logged in by reading sessionStorage
  // returns null if nobody's logged in or the data is corrupted
  function getUserSession(): UserSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      // if JSON.parse fails, the data got messed up somehow
      return null;
    }
  }

  function getUserDisplayName(user: UserSession): string {
    if (user.fullName) return user.fullName;

    if (user.student_profile) {
      const { first_name, last_name } = user.student_profile;
      if (first_name || last_name) {
        return `${first_name || ''} ${last_name || ''}`.trim();
      }
    }

    return user.email ? user.email.split('@')[0] : 'Unknown';
  }

  function showLoggedOutState(): void {
    if (links.profile) links.profile.style.display = 'none';
    if (links.login) links.login.style.display = '';
    if (links.signup) links.signup.style.display = '';
    statusContainer.innerHTML = '';
  }

  // when someone's logged in, show their name and a logout button
  // hide the login and signup links since they don't need those anymore
  function showLoggedInState(user: UserSession): void {
    const displayName = getUserDisplayName(user);
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

  // create and insert the logout button
  function renderLogoutButton(container: HTMLElement): void {
    container.innerHTML = ''; // clear it first
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', handleLogout);
    container.appendChild(logoutBtn);
  }

  // when they click logout, wipe their session and send them home
  function handleLogout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    location.href = 'index.html';
  }

  // main function that checks login state and updates the navbar
  function render(): void {
    const user = getUserSession();
    user ? showLoggedInState(user) : showLoggedOutState();
  }

  // run it once when page loads
  render();
  // also listen for storage changes (in case they log in/out in another tab)
  window.addEventListener('storage', render);
});
