/**
 * Sentinel / CareSight — Patient Deterioration Forecasting System
 * Client-Side Router, Mock Authentication & Ward Overview Engine
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
  const wardOverviewView = document.getElementById('ward-overview-view');
  const genericTabPlaceholder = document.getElementById('generic-tab-placeholder');
  const slotHeading = document.getElementById('slot-heading');
  const slotSubtitle = document.getElementById('slot-subtitle');
  const slotDescription = document.getElementById('slot-description');
  const sidebarNavLinks = document.querySelectorAll('.dashboard-sidebar .nav-link');

  // Ward Overview Controls & Elements
  const patientListContainer = document.getElementById('patient-list-container');
  const wardSortSelect = document.getElementById('ward-sort-select');
  const summaryTotalCount = document.getElementById('summary-total-count');
  const summaryHighCount = document.getElementById('summary-high-count');
  const summaryMediumCount = document.getElementById('summary-medium-count');
  const summaryLowCount = document.getElementById('summary-low-count');
  const wardEmptyState = document.getElementById('ward-empty-state');

  // Mock Patient Dataset (14 Patients from Prompt & Reference Image)
  const mockPatients = [
    {
      bedNumber: "4B-07",
      patientName: "Wilson, Margaret",
      demographics: "F, 72",
      currentScore: 9,
      tier: "high",
      trend: "rising",
      whyOneLine: "RR rising, SpO₂ falling",
      lastUpdated: "2 min ago"
    },
    {
      bedNumber: "4B-12",
      patientName: "Patel, Rakesh",
      demographics: "M, 68",
      currentScore: 8,
      tier: "high",
      trend: "rising",
      whyOneLine: "SBP low, rising respiratory rate",
      lastUpdated: "5 min ago"
    },
    {
      bedNumber: "4B-03",
      patientName: "O'Connor, Liam",
      demographics: "M, 81",
      currentScore: 6,
      tier: "medium",
      trend: "rising",
      whyOneLine: "Increasing respiratory rate",
      lastUpdated: "6 min ago"
    },
    {
      bedNumber: "4B-10",
      patientName: "Chen, Mei",
      demographics: "F, 65",
      currentScore: 5,
      tier: "medium",
      trend: "rising",
      whyOneLine: "SpO₂ borderline, temperature rising",
      lastUpdated: "12 min ago"
    },
    {
      bedNumber: "4B-01",
      patientName: "Ahmed, Sara",
      demographics: "F, 58",
      currentScore: 5,
      tier: "medium",
      trend: "stable",
      whyOneLine: "Mildly low BP, stable otherwise",
      lastUpdated: "15 min ago"
    },
    {
      bedNumber: "4B-06",
      patientName: "Roberts, James",
      demographics: "M, 45",
      currentScore: 2,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "3 min ago"
    },
    {
      bedNumber: "4B-02",
      patientName: "Nguyen, Linh",
      demographics: "F, 50",
      currentScore: 2,
      tier: "low",
      trend: "falling",
      whyOneLine: "All vitals in range",
      lastUpdated: "8 min ago"
    },
    {
      bedNumber: "4B-09",
      patientName: "Hughes, Daniel",
      demographics: "M, 61",
      currentScore: 3,
      tier: "low",
      trend: "stable",
      whyOneLine: "Temperature slightly elevated",
      lastUpdated: "10 min ago"
    },
    {
      bedNumber: "4B-05",
      patientName: "Khan, Aisha",
      demographics: "F, 34",
      currentScore: 1,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "14 min ago"
    },
    {
      bedNumber: "4B-11",
      patientName: "Martin, Oliver",
      demographics: "M, 77",
      currentScore: 3,
      tier: "low",
      trend: "falling",
      whyOneLine: "Heart rate improving",
      lastUpdated: "18 min ago"
    },
    {
      bedNumber: "4B-04",
      patientName: "Taylor, Emma",
      demographics: "F, 29",
      currentScore: 0,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "22 min ago"
    },
    {
      bedNumber: "4B-08",
      patientName: "Brown, Thomas",
      demographics: "M, 69",
      currentScore: 2,
      tier: "low",
      trend: "stable",
      whyOneLine: "SpO₂ stable, no new concerns",
      lastUpdated: "25 min ago"
    },
    {
      bedNumber: "4B-13",
      patientName: "Singh, Arjun",
      demographics: "M, 52",
      currentScore: 1,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "28 min ago"
    },
    {
      bedNumber: "4B-14",
      patientName: "Clark, Sophie",
      demographics: "F, 63",
      currentScore: 2,
      tier: "low",
      trend: "falling",
      whyOneLine: "Observations stable",
      lastUpdated: "32 min ago"
    }
  ];

  // Placeholder Definitions for Other Dashboard Tabs
  const navContentMap = {
    ward: {
      heading: 'Ward overview',
      subtitle: 'All patients in Ward 4B, sorted by clinical risk (highest first).',
      description: ''
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
   * Sort Patients Array based on selected criteria
   * @param {Array} patients
   * @param {string} sortBy - 'risk' | 'bed' | 'name'
   * @returns {Array} sorted array
   */
  function sortPatients(patients, sortBy) {
    const list = [...patients];

    if (sortBy === 'bed') {
      return list.sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true }));
    }

    if (sortBy === 'name') {
      return list.sort((a, b) => a.patientName.localeCompare(b.patientName));
    }

    // Default: 'risk' (Worst-first)
    // 1. Tier order: High (3), Medium (2), Low (1)
    // 2. Trend order: Rising (3), Stable (2), Falling (1)
    // 3. Score (descending)
    const tierWeight = { high: 3, medium: 2, low: 1 };
    const trendWeight = { rising: 3, stable: 2, falling: 1 };

    return list.sort((a, b) => {
      const tierDiff = (tierWeight[b.tier] || 0) - (tierWeight[a.tier] || 0);
      if (tierDiff !== 0) return tierDiff;

      const trendDiff = (trendWeight[b.trend] || 0) - (trendWeight[a.trend] || 0);
      if (trendDiff !== 0) return trendDiff;

      return b.currentScore - a.currentScore;
    });
  }

  /**
   * Render the patient scanning list into the table container
   */
  function renderWardPatients() {
    if (!patientListContainer) return;

    const currentSort = wardSortSelect ? wardSortSelect.value : 'risk';
    const sorted = sortPatients(mockPatients, currentSort);

    // Update summary counts
    if (summaryTotalCount) summaryTotalCount.textContent = `${sorted.length} patients`;
    
    const highCount = sorted.filter(p => p.tier === 'high').length;
    const medCount = sorted.filter(p => p.tier === 'medium').length;
    const lowCount = sorted.filter(p => p.tier === 'low').length;

    if (summaryHighCount) summaryHighCount.textContent = `${highCount} high`;
    if (summaryMediumCount) summaryMediumCount.textContent = `${medCount} medium`;
    if (summaryLowCount) summaryLowCount.textContent = `${lowCount} low`;

    // Handle Empty State
    if (sorted.length === 0) {
      patientListContainer.innerHTML = '';
      if (wardEmptyState) wardEmptyState.style.display = 'block';
      return;
    } else {
      if (wardEmptyState) wardEmptyState.style.display = 'none';
    }

    // Generate Rows HTML
    patientListContainer.innerHTML = sorted.map((p) => {
      // Trend symbol and label
      let trendText = '— Stable';
      let trendClass = 'trend-stable';

      if (p.trend === 'rising') {
        trendText = '↗ Rising';
        trendClass = 'trend-rising';
      } else if (p.trend === 'falling') {
        trendText = '↘ Falling';
        trendClass = 'trend-falling';
      }

      return `
        <div class="patient-row" data-bed="${p.bedNumber}" data-name="${p.patientName}" role="row" tabindex="0">
          <!-- 1. Colored Tier Bar -->
          <div class="col-tier" role="cell">
            <span class="tier-bar tier-bar-${p.tier}" title="${p.tier} risk"></span>
          </div>

          <!-- 2. Bed Number -->
          <div class="col-bed" role="cell">${p.bedNumber}</div>

          <!-- 3. Patient Name & Demographics -->
          <div class="col-patient" role="cell">
            <span class="patient-name">${p.patientName}</span>
            <span class="patient-demographics">${p.demographics}</span>
          </div>

          <!-- 4. Why / Current Status -->
          <div class="col-why" role="cell">${p.whyOneLine}</div>

          <!-- 5. Last Updated -->
          <div class="col-updated" role="cell">${p.lastUpdated}</div>

          <!-- 6. NEWS2 Score Badge -->
          <div class="col-news2" role="cell">
            <span class="score-badge score-badge-${p.tier}">${p.currentScore}</span>
          </div>

          <!-- 7. Trend Arrow & Label -->
          <div class="col-trend" role="cell">
            <span class="trend-indicator ${trendClass}">${trendText}</span>
          </div>

          <!-- 8. Clickable Action Chevron -->
          <div class="col-action" role="cell" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `;
    }).join('');

    // Attach Row Click Events
    const rows = patientListContainer.querySelectorAll('.patient-row');
    rows.forEach((row) => {
      row.addEventListener('click', () => {
        const bed = row.getAttribute('data-bed');
        const name = row.getAttribute('data-name');
        console.log(`[Patient Click] Selected ${name} (${bed}). Ready for Patient Full Report view.`);
        // Pass selected patient info to session storage
        sessionStorage.setItem('selected_patient_bed', bed);
        // Will route to #dashboard/patient/${bed} when Full Report is built
      });

      // Keyboard Accessibility
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          row.click();
        }
      });
    });
  }

  // Bind Sort Dropdown Change
  if (wardSortSelect) {
    wardSortSelect.addEventListener('change', () => {
      renderWardPatients();
    });
  }

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
    // Update active class on sidebar navigation buttons
    sidebarNavLinks.forEach((btn) => {
      if (btn.getAttribute('data-target') === targetKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (targetKey === 'ward') {
      if (wardOverviewView) wardOverviewView.style.display = 'block';
      if (genericTabPlaceholder) genericTabPlaceholder.style.display = 'none';
      renderWardPatients();
    } else {
      if (wardOverviewView) wardOverviewView.style.display = 'none';
      if (genericTabPlaceholder) {
        genericTabPlaceholder.style.display = 'block';
        const data = navContentMap[targetKey] || navContentMap.ward;
        if (slotHeading) slotHeading.textContent = data.heading;
        if (slotSubtitle) slotSubtitle.textContent = data.subtitle;
        if (slotDescription) slotDescription.textContent = data.description;
      }
    }
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

      if (hasError) return;

      // All fields valid: Trigger 'Signing in...' loading state
      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.style.opacity = '0.75';
        loginSubmitBtn.style.cursor = 'not-allowed';
      }

      if (signingInState) {
        signingInState.style.display = 'flex';
      }

      sessionStorage.setItem('sentinel_auth', JSON.stringify({
        authenticated: true,
        user: usernameVal,
        role: 'Admin',
        loginTime: new Date().toISOString()
      }));

      setTimeout(() => {
        navigateTo('dashboard', 'ward');
      }, 700);
    });
  }

  // Initial Route Check on Load
  handleRouteFromHash();
});
