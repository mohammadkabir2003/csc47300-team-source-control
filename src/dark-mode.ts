// handles the dark mode toggle functionality
// saves the user's preference so it persists across pages

const DARK_MODE_KEY = 'ccny_dark_mode';

// check if dark mode was enabled last time
function isDarkModeEnabled(): boolean {
  const saved = localStorage.getItem(DARK_MODE_KEY);
  // default to light mode if they haven't picked yet
  return saved === 'true';
}

// apply dark mode to the page (or remove it)
function applyDarkMode(enabled: boolean): void {
  if (enabled) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  // save their choice for next time
  localStorage.setItem(DARK_MODE_KEY, enabled.toString());
}

// toggle between light and dark
function toggleDarkMode(): void {
  const current = isDarkModeEnabled();
  applyDarkMode(!current);
}

// create the dark mode toggle switch and add it to the navbar
// uses a nice sliding switch design instead of an icon button
function initDarkModeToggle(): void {
  // apply saved preference immediately (before page renders)
  applyDarkMode(isDarkModeEnabled());

  // find the navbar to add our toggle
  const nav = document.querySelector('header .wrap nav');
  if (!nav) return;

  // create a sliding toggle switch
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'dark-mode-toggle';
  toggleBtn.setAttribute('aria-label', 'Toggle dark mode');
  
  // if dark mode is on, mark it as active so the switch slides right
  if (isDarkModeEnabled()) {
    toggleBtn.classList.add('active');
  }
  
  // when clicked, toggle dark mode and slide the switch
  toggleBtn.addEventListener('click', () => {
    toggleDarkMode();
    // update the toggle switch position
    if (isDarkModeEnabled()) {
      toggleBtn.classList.add('active');
    } else {
      toggleBtn.classList.remove('active');
    }
  });

  // stick it at the end of the nav
  nav.appendChild(toggleBtn);
}

// run it when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDarkModeToggle);
} else {
  // page already loaded, run it now
  initDarkModeToggle();
}

export { isDarkModeEnabled, toggleDarkMode, applyDarkMode };
