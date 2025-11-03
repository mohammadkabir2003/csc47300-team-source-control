import { UserSession } from './types.js';

const STORAGE_KEY = 'loggedInUser';
const STATUS_ELEMENT_ID = 'headerUserStatus';

document.addEventListener('DOMContentLoaded', (): void => {
  const nav = document.querySelector('header .wrap nav');
  if (!nav) return;

  const links = {
    profile: nav.querySelector('a[href="user.html"]') as HTMLAnchorElement | null,
    login: nav.querySelector('a[href="login.html"]') as HTMLAnchorElement | null,
    signup: nav.querySelector('a[href="signup.html"]') as HTMLAnchorElement | null
  };

  if (!links.profile) {
    links.profile = createProfileLink();
    const insertPosition = nav.querySelector('a[href="login.html"]');
    if (insertPosition) {
      nav.insertBefore(links.profile, insertPosition);
    } else {
      nav.appendChild(links.profile);
    }
  }

  const statusContainer = getOrCreateStatusContainer(nav);

  function createProfileLink(): HTMLAnchorElement {
    const link = document.createElement('a');
    link.className = 'nav-link';
    link.href = 'user.html';
    link.textContent = 'Profile';
    return link;
  }

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

  function getUserSession(): UserSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as UserSession;
    } catch {
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

  function showLoggedInState(user: UserSession): void {
    const displayName = getUserDisplayName(user);
    const firstName = displayName.split(' ')[0];

    if (links.profile) {
      links.profile.style.display = '';
      links.profile.title = `View profile (${displayName})`;
      links.profile.textContent = firstName;
    }
    if (links.login) links.login.style.display = 'none';
    if (links.signup) links.signup.style.display = 'none';

    renderLogoutButton(statusContainer);
  }

  function renderLogoutButton(container: HTMLElement): void {
    container.innerHTML = '';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', handleLogout);
    container.appendChild(logoutBtn);
  }

  function handleLogout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    location.href = 'index.html';
  }

  function render(): void {
    const user = getUserSession();
    user ? showLoggedInState(user) : showLoggedOutState();
  }

  render();
  window.addEventListener('storage', render);
});
