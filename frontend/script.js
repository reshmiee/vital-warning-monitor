/**
 * CareSight — Patient Deterioration Forecasting System
 * Landing Page & Authentication Routing Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const navLoginBtn = document.getElementById('nav-login-btn');
  const heroLoginBtn = document.getElementById('hero-login-btn');
  const loginModal = document.getElementById('login-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const mockLoginForm = document.getElementById('mock-login-form');
  const usernameInput = document.getElementById('username-input');

  /**
   * Open the mock login modal gate
   */
  function openLoginModal() {
    if (loginModal) {
      loginModal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      if (usernameInput) {
        setTimeout(() => usernameInput.focus(), 50);
      }
    }
  }

  /**
   * Close the mock login modal gate
   */
  function closeLoginModal() {
    if (loginModal) {
      loginModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // Bind Event Listeners
  if (navLoginBtn) {
    navLoginBtn.addEventListener('click', openLoginModal);
  }

  if (heroLoginBtn) {
    heroLoginBtn.addEventListener('click', openLoginModal);
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeLoginModal);
  }

  // Close on backdrop click
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        closeLoginModal();
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal && loginModal.style.display === 'flex') {
      closeLoginModal();
    }
  });

  // Handle Mock Login Submission
  if (mockLoginForm) {
    mockLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('submit-login-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Authorizing session...';
      }

      // Simulate instantaneous authentication pass-through
      setTimeout(() => {
        // Store session state in sessionStorage
        sessionStorage.setItem('caresight_auth', JSON.stringify({
          authenticated: true,
          user: usernameInput ? usernameInput.value.trim() || 'Dr. Sarah Connor' : 'Clinician',
          role: 'Attending Physician',
          loginTime: new Date().toISOString()
        }));

        // Feedback notification before dashboard shell loads
        if (submitBtn) {
          submitBtn.innerHTML = 'Redirecting to Ward Overview...';
        }

        setTimeout(() => {
          closeLoginModal();
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Enter Clinical Dashboard →';
          }
          // Ready for view transition to dashboard shell in subsequent step
          console.log('Authenticated successfully into CareSight Clinical Dashboard.');
        }, 400);
      }, 350);
    });
  }
});
