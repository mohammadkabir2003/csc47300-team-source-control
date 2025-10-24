document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('header .wrap nav');
  if (!nav) return;

  let profileLink = nav.querySelector('a[href="user.html"]');
  const loginLink = nav.querySelector('a[href="login.html"]');
  const signupBtn = nav.querySelector('a[href="signup.html"]');

  if (!profileLink) {
    profileLink = document.createElement('a');
    profileLink.className = 'nav-link';
    profileLink.href = 'user.html';
    profileLink.textContent = 'Profile';
    const insertBefore = nav.querySelector('a[href="login.html"]');
    if (insertBefore) nav.insertBefore(profileLink, insertBefore);
    else nav.appendChild(profileLink);
  }

  let status = document.getElementById('headerUserStatus');
  if (!status) {
    status = document.createElement('span');
    status.id = 'headerUserStatus';
    status.style.cssText = 'margin-left:0.6rem;display:flex;gap:0.5rem;align-items:center';
    nav.appendChild(status);
  }

  function render() {
    const raw = sessionStorage.getItem('loggedInUser');
    if (!raw) {
      profileLink.style.display = 'none';
      if (loginLink) loginLink.style.display = '';
      if (signupBtn) signupBtn.style.display = '';
      status.innerHTML = '';
      return;
    }

    let user = null;
    try { user = JSON.parse(raw); } catch (e) { user = null; }
    if (!user) return;

    let fullName = 'Unknown';
    if (user.fullName) {
      fullName = user.fullName;
    } else if (user.student_profile) {
      const s = user.student_profile;
      if (s.first_name || s.last_name) {
        fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
      }
    }
    if (fullName === 'Unknown' && user.email) {
      fullName = user.email.split('@')[0];
    }

    profileLink.style.display = '';
    profileLink.title = `View profile (${fullName})`;
    profileLink.textContent = fullName.split(' ')[0];
    if (loginLink) loginLink.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';

    status.innerHTML = '';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('loggedInUser');
      location.href = 'index.html';
    });
    status.appendChild(logoutBtn);
  }

  render();
  window.addEventListener('storage', render);
});
