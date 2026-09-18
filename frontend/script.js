/**
 * Sentinel / CareSight — Patient Deterioration Forecasting System
 * Client-Side Router & Mock Authentication Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Page Containers
  const landingPageView = document.getElementById('landing-page');
  const loginPageView = document.getElementById('login-page');

  // Trigger Buttons
  const navLoginBtn = document.getElementById('nav-login-btn');
  const heroLoginBtn = document.getElementById('hero-login-btn');
  const backToLandingBtn = document.getElementById('back-to-landing-btn');

  // Login Form & Inputs
  const sentinelLoginForm = document.getElementById('sentinel-login-form');
  const usernameInput = document.getElementById('sentinel-username');
  const passwordInput = document.getElementById('sentinel-password');
  const groupUsername = document.getElementById('group-username');
  const groupPassword = document.getElementById('group-password');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const signingInState = document.getElementById('signing-in-state');

  /**
   * Router: Switch between views
   * @param {string} viewName - 'landing' | 'login'
   */
  function navigateTo(viewName) {
    if (viewName === 'login') {
      if (landingPageView) landingPageView.classList.remove('active');
      if (loginPageView) loginPageView.classList.add('active');
      window.scrollTo(0, 0);
      window.location.hash = 'login';
      
      // Focus username field on load
      if (usernameInput) {
        setTimeout(() => usernameInput.focus(), 80);
      }
    } else {
      if (loginPageView) loginPageView.classList.remove('active');
      if (landingPageView) landingPageView.classList.add('active');
      window.scrollTo(0, 0);
      window.location.hash = 'landing';
    }
  }

  // Handle URL hash changes (deep linking / back button support)
  function handleRouteFromHash() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#login') {
      navigateTo('login');
    } else {
      navigateTo('landing');
    }
  }

  // Bind Navigation Clicks
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
        role: 'Attending Clinician',
        loginTime: new Date().toISOString()
      }));

      // Brief delay simulating authorization before transitioning to dashboard
      setTimeout(() => {
        console.log(`[Sentinel Auth] User '${usernameVal}' logged in successfully.`);
        
        // When dashboard shell is built, navigateTo('dashboard') will trigger here
        if (signingInState) {
          const spinnerText = signingInState.querySelector('.spinner-text');
          if (spinnerText) spinnerText.textContent = 'Authenticated. Ready for Dashboard Shell.';
        }
      }, 950);
    });
  }

  // Initial Route Check on Load
  handleRouteFromHash();
});
