/**
 * Sentinel / CareSight — Patient Deterioration Forecasting System
 * Client-Side Router, Mock Authentication & Dashboard Shell Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Page Containers
  const landingPageView = document.getElementById('landing-page');
  const loginPageView = document.getElementById('login-page');
  const dashboardShellView = document.getElementById('dashboard-shell');

  // Trigger & Nav Buttons
  const navLoginBtn = document.getElementById('nav-login-btn');
  const heroLoginBtn = document.getElementById('hero-login-btn');
  const backToLandingBtn = document.getElementById('back-to-landing-btn');
  const shellLogoutBtn = document.getElementById('shell-logout-btn');

  // Login Form & Inputs
  const sentinelLoginForm = document.getElementById('sentinel-login-form');
  const usernameInput = document.getElementById('sentinel-username');
  const passwordInput = document.getElementById('sentinel-password');
  const groupUsername = document.getElementById('group-username');
  const groupPassword = document.getElementById('group-password');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const signingInState = document.getElementById('signing-in-state');

  // Dashboard Shell Slots & Controls
  const slotHeading = document.getElementById('slot-heading');
  const slotSubtitle = document.getElementById('slot-subtitle');
  const slotDescription = document.getElementById('slot-description');
  const sidebarNavLinks = document.querySelectorAll('.dashboard-sidebar .nav-link');

  // Navigation Slot Definitions matching Prompt Section 7
  const navContentMap = {
    ward: {
      heading: 'Ward overview',
      subtitle: 'Ward overview content goes here.',
      description: 'This is a placeholder for the Ward overview page. Replace this section with the actual patient list and status cards.'
    },
    surveillance: {
      heading: 'High surveillance',
      subtitle: 'High surveillance content goes here.',
      description: 'This is a placeholder for the High surveillance list. Replace this section with deteriorating patients sorted worst-first.'
    },
    lookup: {
      heading: 'Patient lookup',
      subtitle: 'Patient lookup content goes here.',
      description: 'This is a placeholder for the Patient lookup page. Replace this section with the ward and patient selector/search.'
    },
    alerts: {
      heading: 'Alerts history',
      subtitle: 'Alerts history content goes here.',
      description: 'This is a placeholder for the Alerts history page. Replace this section with past deterioration event timeline.'
    }
  };

  /**
   * Router: Switch between top-level views
   * @param {string} viewName - 'landing' | 'login' | 'dashboard'
   * @param {string} subView - 'ward' | 'surveillance' | 'lookup' | 'alerts'
   */
  function navigateTo(viewName, subView = 'ward') {
    // Hide all views first
    if (landingPageView) landingPageView.classList.remove('active');
    if (loginPageView) loginPageView.classList.remove('active');
    if (dashboardShellView) dashboardShellView.classList.remove('active');

    if (viewName === 'login') {
      if (loginPageView) loginPageView.classList.add('active');
      window.scrollTo(0, 0);
      window.location.hash = 'login';
      
      // Reset form states
      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.style.opacity = '1';
        loginSubmitBtn.style.cursor = 'pointer';
      }
      if (signingInState) {
        signingInState.style.display = 'none';
        const spinnerText = signingInState.querySelector('.spinner-text');
        if (spinnerText) spinnerText.textContent = 'Signing in...';
      }

      if (usernameInput) {
        setTimeout(() => usernameInput.focus(), 80);
      }
    } else if (viewName === 'dashboard') {
      if (dashboardShellView) dashboardShellView.classList.add('active');
      window.scrollTo(0, 0);
      window.location.hash = `dashboard/${subView}`;
      switchDashboardSlot(subView);
    } else {
      // Default: Landing page
      if (landingPageView) landingPageView.classList.add('active');
      window.scrollTo(0, 0);
      window.location.hash = 'landing';
    }
  }

  /**
   * Switch the active slot inside the Dashboard Shell
   * @param {string} targetKey - 'ward' | 'surveillance' | 'lookup' | 'alerts'
   */
  function switchDashboardSlot(targetKey) {
    const data = navContentMap[targetKey] || navContentMap.ward;

    // Update active class on sidebar navigation buttons
    sidebarNavLinks.forEach((btn) => {
      if (btn.getAttribute('data-target') === targetKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update main panel copy with smooth transition
    if (slotHeading) slotHeading.textContent = data.heading;
    if (slotSubtitle) slotSubtitle.textContent = data.subtitle;
    if (slotDescription) slotDescription.textContent = data.description;
  }

  // Handle URL hash changes (deep linking / back-forward support)
  function handleRouteFromHash() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#login') {
      navigateTo('login');
    } else if (hash.startsWith('#dashboard')) {
      const parts = hash.split('/');
      const sub = parts[1] || 'ward';
      navigateTo('dashboard', sub);
    } else {
      navigateTo('landing');
    }
  }

  // Bind Landing & Login Navigation Clicks
  if (navLoginBtn) {
    navLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('login');
    });
  }

  if (heroLoginBtn) {
    heroLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('login');
    });
  }

  if (backToLandingBtn) {
    backToLandingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('landing');
    });
  }

  // Logout from dashboard shell back to landing page
  if (shellLogoutBtn) {
    shellLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('sentinel_auth');
      navigateTo('landing');
    });
  }

  // Bind Sidebar Navigation Items
  sidebarNavLinks.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target') || 'ward';
      window.location.hash = `dashboard/${target}`;
      switchDashboardSlot(target);
    });
  });

  // Listen for browser back/forward buttons
  window.addEventListener('hashchange', handleRouteFromHash);

  // Clear validation errors on user typing
  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      if (groupUsername && usernameInput.value.trim().length > 0) {
        groupUsername.classList.remove('has-error');
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (groupPassword && passwordInput.value.trim().length > 0) {
        groupPassword.classList.remove('has-error');
      }
    });
  }

  // Handle Mock Login Submission & Validation
  if (sentinelLoginForm) {
    sentinelLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const usernameVal = usernameInput ? usernameInput.value.trim() : '';
      const passwordVal = passwordInput ? passwordInput.value.trim() : '';
      let hasError = false;

      // Validate Username
      if (!usernameVal) {
        if (groupUsername) groupUsername.classList.add('has-error');
        hasError = true;
      } else {
        if (groupUsername) groupUsername.classList.remove('has-error');
      }

      // Validate Password
      if (!passwordVal) {
        if (groupPassword) groupPassword.classList.add('has-error');
        hasError = true;
      } else {
        if (groupPassword) groupPassword.classList.remove('has-error');
      }

      // If either field is empty, halt submission (matches reference image error state)
      if (hasError) {
        return;
      }

      // All fields valid: Trigger 'Signing in...' loading state
      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.style.opacity = '0.75';
        loginSubmitBtn.style.cursor = 'not-allowed';
      }

      if (signingInState) {
        signingInState.style.display = 'flex';
      }

      // Mock authentication session persistence
      sessionStorage.setItem('sentinel_auth', JSON.stringify({
        authenticated: true,
        user: usernameVal,
        role: 'Admin',
        loginTime: new Date().toISOString()
      }));

      // Brief delay simulating authorization before transitioning into the dashboard shell
      setTimeout(() => {
        console.log(`[Sentinel Auth] User '${usernameVal}' logged in successfully.`);
        navigateTo('dashboard', 'ward');
      }, 700);
    });
  }

  // Initial Route Check on Load
  handleRouteFromHash();
});
