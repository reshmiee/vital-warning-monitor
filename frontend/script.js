/**
 * Sentinel / CareSight — Patient Deterioration Forecasting System
 * Client-Side Router, Mock Authentication, Ward Overview, High Surveillance,
 * Patient Lookup & Patient Full Report Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Top-Level Page Containers
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

  // Dashboard Subviews
  const wardOverviewView = document.getElementById('ward-overview-view');
  const highSurveillanceView = document.getElementById('high-surveillance-view');
  const patientLookupView = document.getElementById('patient-lookup-view');
  const patientReportView = document.getElementById('patient-report-view');
  const genericTabPlaceholder = document.getElementById('generic-tab-placeholder');
  const slotHeading = document.getElementById('slot-heading');
  const slotSubtitle = document.getElementById('slot-subtitle');
  const slotDescription = document.getElementById('slot-description');
  const sidebarNavLinks = document.querySelectorAll('.dashboard-sidebar .nav-link');
  const globalPatientSearch = document.getElementById('global-patient-search');

  // Ward Overview Elements
  const patientListContainer = document.getElementById('patient-list-container');
  const wardSortSelect = document.getElementById('ward-sort-select');
  const summaryTotalCount = document.getElementById('summary-total-count');
  const summaryHighCount = document.getElementById('summary-high-count');
  const summaryMediumCount = document.getElementById('summary-medium-count');
  const summaryLowCount = document.getElementById('summary-low-count');
  const wardEmptyState = document.getElementById('ward-empty-state');

  // High Surveillance Elements
  const surveillancePatientList = document.getElementById('surveillance-patient-list');
  const surveillanceTotalCount = document.getElementById('surveillance-total-count');
  const surveillanceHighCount = document.getElementById('surveillance-high-count');
  const surveillanceMediumCount = document.getElementById('surveillance-medium-count');
  const surveillanceLowCount = document.getElementById('surveillance-low-count');
  const caughtUpBanner = document.getElementById('caught-up-banner');

  // Patient Lookup Elements
  const lookupWardSelect = document.getElementById('lookup-ward-select');
  const lookupPatientInput = document.getElementById('lookup-patient-input');
  const lookupClearBtn = document.getElementById('lookup-clear-btn');
  const lookupResultsSection = document.getElementById('lookup-results-section');
  const lookupResultsHeading = document.getElementById('lookup-results-heading');
  const lookupResultsBody = document.getElementById('lookup-results-body');
  const lookupInitialState = document.getElementById('lookup-initial-state');
  const lookupNoResultsState = document.getElementById('lookup-no-results-state');
  const noMatchQueryText = document.getElementById('no-match-query-text');

  // Patient Report Elements
  const reportBackBtn = document.getElementById('report-back-btn');
  const reportTimestampText = document.getElementById('report-timestamp-text');
  const reportRefreshBtn = document.getElementById('report-refresh-btn');
  const reportTierIndicator = document.getElementById('report-tier-indicator');
  const reportPatientName = document.getElementById('report-patient-name');
  const reportPatientMeta = document.getElementById('report-patient-meta');
  const reportWhyText = document.getElementById('report-why-text');
  const reportScoreBox = document.getElementById('report-score-box');
  const reportScoreValue = document.getElementById('report-score-value');
  const reportScoreLabel = document.getElementById('report-score-label');
  const reportTrendValue = document.getElementById('report-trend-value');
  const vitalValRr = document.getElementById('vital-val-rr');
  const vitalStatusRr = document.getElementById('vital-status-rr');
  const vitalValSpo2 = document.getElementById('vital-val-spo2');
  const vitalStatusSpo2 = document.getElementById('vital-status-spo2');
  const vitalValBp = document.getElementById('vital-val-bp');
  const vitalStatusBp = document.getElementById('vital-status-bp');
  const vitalValPulse = document.getElementById('vital-val-pulse');
  const vitalStatusPulse = document.getElementById('vital-status-pulse');
  const vitalValTemp = document.getElementById('vital-val-temp');
  const vitalStatusTemp = document.getElementById('vital-status-temp');
  const reportAlertsBody = document.getElementById('report-alerts-body');

  // State Tracking
  let lastActiveDashboardTab = 'ward'; // 'ward' | 'surveillance' | 'lookup'
  let currentReportPatient = null;

  // Shared Mock Patient Dataset (Single Source of Truth across all views)
  const mockPatients = [
    {
      id: "P-004B-07",
      bedNumber: "4B-07",
      patientName: "Wilson, Margaret",
      demographics: "F, 72",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 9,
      tier: "high",
      trend: "rising",
      whyOneLine: "RR rising, SpO₂ falling",
      lastUpdated: "2 min ago",
      vitals: {
        respiratoryRate: 24,
        rrStatus: "rising",
        oxygenSaturation: 91,
        spo2Status: "falling",
        systolicBP: 98,
        bpStatus: "stable",
        pulse: 102,
        pulseStatus: "stable",
        temperature: 37.8,
        tempStatus: "stable"
      },
      alerts: [
        { time: "14:02", event: "Flagged high", tier: "high", details: "NEWS2 9 — RR rising, SpO₂ falling" },
        { time: "11:17", event: "Flagged medium", tier: "medium", details: "NEWS2 6 — increasing respiratory rate" },
        { time: "09:34", event: "Observations updated", tier: "neutral", details: "SpO₂ 92% → 91%, RR 20 → 24" },
        { time: "06:12", event: "Flagged medium", tier: "medium", details: "NEWS2 5 — temperature rising" },
        { time: "01:48", event: "Resolved", tier: "low", details: "NEWS2 3 — back in range" }
      ]
    },
    {
      id: "P-004B-12",
      bedNumber: "4B-12",
      patientName: "Patel, Rakesh",
      demographics: "M, 68",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 8,
      tier: "high",
      trend: "rising",
      whyOneLine: "SBP low, rising respiratory rate",
      lastUpdated: "5 min ago",
      vitals: {
        respiratoryRate: 22,
        rrStatus: "rising",
        oxygenSaturation: 94,
        spo2Status: "stable",
        systolicBP: 92,
        bpStatus: "falling",
        pulse: 110,
        pulseStatus: "rising",
        temperature: 38.2,
        tempStatus: "rising"
      },
      alerts: [
        { time: "13:50", event: "Flagged high", tier: "high", details: "NEWS2 8 — SBP low, rising respiratory rate" },
        { time: "10:15", event: "Flagged medium", tier: "medium", details: "NEWS2 5 — heart rate increasing" }
      ]
    },
    {
      id: "P-004B-03",
      bedNumber: "4B-03",
      patientName: "O'Connor, Liam",
      demographics: "M, 81",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 6,
      tier: "medium",
      trend: "rising",
      whyOneLine: "Increasing respiratory rate",
      lastUpdated: "6 min ago",
      vitals: {
        respiratoryRate: 21,
        rrStatus: "rising",
        oxygenSaturation: 95,
        spo2Status: "stable",
        systolicBP: 115,
        bpStatus: "stable",
        pulse: 88,
        pulseStatus: "stable",
        temperature: 37.4,
        tempStatus: "stable"
      },
      alerts: [
        { time: "13:30", event: "Flagged medium", tier: "medium", details: "NEWS2 6 — increasing respiratory rate" }
      ]
    },
    {
      id: "P-004B-10",
      bedNumber: "4B-10",
      patientName: "Chen, Mei",
      demographics: "F, 65",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 5,
      tier: "medium",
      trend: "rising",
      whyOneLine: "SpO₂ borderline, temperature rising",
      lastUpdated: "12 min ago",
      vitals: {
        respiratoryRate: 19,
        rrStatus: "stable",
        oxygenSaturation: 93,
        spo2Status: "falling",
        systolicBP: 122,
        bpStatus: "stable",
        pulse: 94,
        pulseStatus: "stable",
        temperature: 38.4,
        tempStatus: "rising"
      },
      alerts: [
        { time: "12:15", event: "Flagged medium", tier: "medium", details: "NEWS2 5 — temperature rising" }
      ]
    },
    {
      id: "P-004B-01",
      bedNumber: "4B-01",
      patientName: "Ahmed, Sara",
      demographics: "F, 58",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 3,
      tier: "low",
      trend: "stable",
      whyOneLine: "Mildly low BP, stable otherwise",
      lastUpdated: "15 min ago",
      vitals: {
        respiratoryRate: 18,
        rrStatus: "stable",
        oxygenSaturation: 96,
        spo2Status: "stable",
        systolicBP: 98,
        bpStatus: "stable",
        pulse: 78,
        pulseStatus: "stable",
        temperature: 36.9,
        tempStatus: "stable"
      },
      alerts: [
        { time: "09:00", event: "Observations updated", tier: "neutral", details: "BP stable at 98 mmHg" }
      ]
    },
    {
      id: "P-004B-06",
      bedNumber: "4B-06",
      patientName: "Roberts, James",
      demographics: "M, 45",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 2,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "3 min ago",
      vitals: {
        respiratoryRate: 16,
        rrStatus: "stable",
        oxygenSaturation: 98,
        spo2Status: "stable",
        systolicBP: 124,
        bpStatus: "stable",
        pulse: 72,
        pulseStatus: "stable",
        temperature: 36.8,
        tempStatus: "stable"
      },
      alerts: []
    },
    {
      id: "P-004B-02",
      bedNumber: "4B-02",
      patientName: "Nguyen, Linh",
      demographics: "F, 50",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 2,
      tier: "low",
      trend: "falling",
      whyOneLine: "All vitals in range",
      lastUpdated: "8 min ago",
      vitals: {
        respiratoryRate: 15,
        rrStatus: "falling",
        oxygenSaturation: 99,
        spo2Status: "stable",
        systolicBP: 118,
        bpStatus: "stable",
        pulse: 68,
        pulseStatus: "falling",
        temperature: 36.6,
        tempStatus: "stable"
      },
      alerts: []
    },
    {
      id: "P-004B-09",
      bedNumber: "4B-09",
      patientName: "Wilkins, Robert",
      demographics: "M, 68",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 5,
      tier: "medium",
      trend: "stable",
      whyOneLine: "Temperature slightly elevated",
      lastUpdated: "10 min ago",
      vitals: {
        respiratoryRate: 18,
        rrStatus: "stable",
        oxygenSaturation: 96,
        spo2Status: "stable",
        systolicBP: 128,
        bpStatus: "stable",
        pulse: 84,
        pulseStatus: "stable",
        temperature: 38.0,
        tempStatus: "rising"
      },
      alerts: [
        { time: "11:15", event: "Flagged medium", tier: "medium", details: "NEWS2 5 — temperature rising" },
        { time: "08:40", event: "Observations updated", tier: "neutral", details: "Temp 37.5°C → 38.0°C" }
      ]
    },
    {
      id: "P-004B-05",
      bedNumber: "4B-05",
      patientName: "Khan, Aisha",
      demographics: "F, 34",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 1,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "14 min ago",
      vitals: {
        respiratoryRate: 14,
        rrStatus: "stable",
        oxygenSaturation: 99,
        spo2Status: "stable",
        systolicBP: 112,
        bpStatus: "stable",
        pulse: 65,
        pulseStatus: "stable",
        temperature: 36.7,
        tempStatus: "stable"
      },
      alerts: []
    },
    {
      id: "P-004B-11",
      bedNumber: "4B-11",
      patientName: "Martin, Oliver",
      demographics: "M, 77",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 3,
      tier: "low",
      trend: "rising",
      whyOneLine: "Heart rate increasing",
      lastUpdated: "18 min ago",
      vitals: {
        respiratoryRate: 18,
        rrStatus: "rising",
        oxygenSaturation: 95,
        spo2Status: "stable",
        systolicBP: 128,
        bpStatus: "stable",
        pulse: 96,
        pulseStatus: "rising",
        temperature: 37.2,
        tempStatus: "stable"
      },
      alerts: [
        { time: "11:00", event: "Observations updated", tier: "neutral", details: "Pulse 84 → 96 /min" }
      ]
    },
    {
      id: "P-004B-04",
      bedNumber: "4B-04",
      patientName: "Taylor, Emma",
      demographics: "F, 29",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 0,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "22 min ago",
      vitals: {
        respiratoryRate: 14,
        rrStatus: "stable",
        oxygenSaturation: 100,
        spo2Status: "stable",
        systolicBP: 110,
        bpStatus: "stable",
        pulse: 62,
        pulseStatus: "stable",
        temperature: 36.5,
        tempStatus: "stable"
      },
      alerts: []
    },
    {
      id: "P-004B-08",
      bedNumber: "4B-08",
      patientName: "Brown, Thomas",
      demographics: "M, 69",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 2,
      tier: "low",
      trend: "stable",
      whyOneLine: "SpO₂ stable, no new concerns",
      lastUpdated: "25 min ago",
      vitals: {
        respiratoryRate: 16,
        rrStatus: "stable",
        oxygenSaturation: 96,
        spo2Status: "stable",
        systolicBP: 135,
        bpStatus: "stable",
        pulse: 74,
        pulseStatus: "stable",
        temperature: 37.0,
        tempStatus: "stable"
      },
      alerts: []
    },
    {
      id: "P-004B-13",
      bedNumber: "4B-13",
      patientName: "Singh, Arjun",
      demographics: "M, 52",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 1,
      tier: "low",
      trend: "stable",
      whyOneLine: "All vitals in range",
      lastUpdated: "28 min ago",
      vitals: {
        respiratoryRate: 15,
        rrStatus: "stable",
        oxygenSaturation: 98,
        spo2Status: "stable",
        systolicBP: 120,
        bpStatus: "stable",
        pulse: 70,
        pulseStatus: "stable",
        temperature: 36.8,
        tempStatus: "stable"
      },
      alerts: []
    },
    {
      id: "P-004B-14",
      bedNumber: "4B-14",
      patientName: "Clark, Sophie",
      demographics: "F, 63",
      ward: "Ward 4B",
      department: "General Medicine",
      currentScore: 2,
      tier: "low",
      trend: "falling",
      whyOneLine: "Observations stable",
      lastUpdated: "32 min ago",
      vitals: {
        respiratoryRate: 14,
        rrStatus: "falling",
        oxygenSaturation: 98,
        spo2Status: "stable",
        systolicBP: 116,
        bpStatus: "stable",
        pulse: 66,
        pulseStatus: "falling",
        temperature: 36.7,
        tempStatus: "stable"
      },
      alerts: []
    }
  ];

  /**
   * Sort Patients Array based on selected criteria
   * @param {Array} patients
   * @param {string} sortBy - 'risk' | 'bed' | 'name'
   * @returns {Array} sorted array
   */
  function sortPatients(patients, sortBy = 'risk') {
    const list = [...patients];

    if (sortBy === 'bed') {
      return list.sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true }));
    }

    if (sortBy === 'name') {
      return list.sort((a, b) => a.patientName.localeCompare(b.patientName));
    }

    // Default: 'risk' (Worst-first)
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
   * Reusable Component: Render compact status rows into a target container
   * @param {Array} patients 
   * @param {HTMLElement} targetContainer 
   * @param {string} sourceTab - 'ward' | 'surveillance'
   */
  function renderPatientRows(patients, targetContainer, sourceTab = 'ward') {
    if (!targetContainer) return;

    targetContainer.innerHTML = patients.map((p) => {
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
          <div class="col-tier" role="cell">
            <span class="tier-bar tier-bar-${p.tier}" title="${p.tier} risk"></span>
          </div>
          <div class="col-bed" role="cell">${p.bedNumber}</div>
          <div class="col-patient" role="cell">
            <span class="patient-name">${p.patientName}</span>
            <span class="patient-demographics">${p.demographics}</span>
          </div>
          <div class="col-why" role="cell">${p.whyOneLine}</div>
          <div class="col-updated" role="cell">${p.lastUpdated}</div>
          <div class="col-news2" role="cell">
            <span class="score-badge score-badge-${p.tier}">${p.currentScore}</span>
          </div>
          <div class="col-trend" role="cell">
            <span class="trend-indicator ${trendClass}">${trendText}</span>
          </div>
          <div class="col-action" role="cell" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `;
    }).join('');

    // Attach Row Click Events -> Navigate to Patient Full Report
    const rows = targetContainer.querySelectorAll('.patient-row');
    rows.forEach((row) => {
      row.addEventListener('click', () => {
        const bed = row.getAttribute('data-bed');
        openPatientReport(bed, sourceTab);
      });

      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          row.click();
        }
      });
    });
  }

  /**
   * Render Ward Overview
   */
  function renderWardPatients() {
    if (!patientListContainer) return;

    const currentSort = wardSortSelect ? wardSortSelect.value : 'risk';
    const sorted = sortPatients(mockPatients, currentSort);

    if (summaryTotalCount) summaryTotalCount.textContent = `${sorted.length} patients`;
    
    const highCount = sorted.filter(p => p.tier === 'high').length;
    const medCount = sorted.filter(p => p.tier === 'medium').length;
    const lowCount = sorted.filter(p => p.tier === 'low').length;

    if (summaryHighCount) summaryHighCount.textContent = `${highCount} high`;
    if (summaryMediumCount) summaryMediumCount.textContent = `${medCount} medium`;
    if (summaryLowCount) summaryLowCount.textContent = `${lowCount} low`;

    if (sorted.length === 0) {
      patientListContainer.innerHTML = '';
      if (wardEmptyState) wardEmptyState.style.display = 'block';
    } else {
      if (wardEmptyState) wardEmptyState.style.display = 'none';
      renderPatientRows(sorted, patientListContainer, 'ward');
    }
  }

  /**
   * Render High Surveillance
   */
  function renderHighSurveillance() {
    if (!surveillancePatientList) return;

    const filtered = mockPatients.filter(p => p.tier === "high" || p.trend === "rising");
    const sorted = sortPatients(filtered, 'risk');

    if (surveillanceTotalCount) surveillanceTotalCount.textContent = `${sorted.length} patients`;

    const highCount = sorted.filter(p => p.tier === 'high').length;
    const medCount = sorted.filter(p => p.tier === 'medium').length;
    const lowRisingCount = sorted.filter(p => p.tier === 'low' && p.trend === 'rising').length;

    if (surveillanceHighCount) surveillanceHighCount.textContent = `${highCount} high`;
    if (surveillanceMediumCount) surveillanceMediumCount.textContent = `${medCount} medium`;
    if (surveillanceLowCount) surveillanceLowCount.textContent = `${lowRisingCount} low (rising)`;

    renderPatientRows(sorted, surveillancePatientList, 'surveillance');

    if (caughtUpBanner) {
      caughtUpBanner.style.display = 'flex';
    }
  }

  // Bind Ward Sort Dropdown Change
  if (wardSortSelect) {
    wardSortSelect.addEventListener('change', () => {
      renderWardPatients();
    });
  }

  /* ==========================================================================
     PART A: PATIENT LOOKUP SEARCH ENGINE
     ========================================================================== */
  function filterLookupPatients(query) {
    const clean = (query || '').trim().toLowerCase();
    if (!clean) return [];

    return mockPatients.filter(p => 
      p.patientName.toLowerCase().includes(clean) || 
      p.bedNumber.toLowerCase().includes(clean)
    );
  }

  function handleLookupInput() {
    if (!lookupPatientInput) return;
    const query = lookupPatientInput.value.trim();

    // Toggle clear button
    if (lookupClearBtn) {
      lookupClearBtn.style.display = query ? 'block' : 'none';
    }

    if (!query) {
      if (lookupInitialState) lookupInitialState.style.display = 'flex';
      if (lookupResultsSection) lookupResultsSection.style.display = 'none';
      if (lookupNoResultsState) lookupNoResultsState.style.display = 'none';
      return;
    }

    const matches = filterLookupPatients(query);

    if (matches.length > 0) {
      if (lookupInitialState) lookupInitialState.style.display = 'none';
      if (lookupNoResultsState) lookupNoResultsState.style.display = 'none';
      if (lookupResultsSection) lookupResultsSection.style.display = 'block';

      if (lookupResultsHeading) {
        lookupResultsHeading.textContent = `${matches.length} result${matches.length > 1 ? 's' : ''} for "${query}" in Ward 4B`;
      }

      if (lookupResultsBody) {
        lookupResultsBody.innerHTML = matches.map(p => `
          <div class="lookup-patient-row patient-row" data-bed="${p.bedNumber}" data-name="${p.patientName}" role="row" tabindex="0">
            <div class="col-lookup-tier" role="cell">
              <span class="tier-bar tier-bar-${p.tier}" title="${p.tier} risk"></span>
            </div>
            <div class="col-lookup-bed" role="cell">${p.bedNumber}</div>
            <div class="col-lookup-name" role="cell">
              <span class="patient-name">${p.patientName}</span>
              <span class="patient-demographics">${p.demographics}</span>
            </div>
            <div class="col-lookup-ward" role="cell">
              <div>${p.ward}</div>
              <div style="font-size: 0.78rem; color: #64748B;">${p.department}</div>
            </div>
            <div class="col-lookup-action" role="cell" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        `).join('');

        // Attach click listeners to rows -> Navigate to Patient Full Report
        const rows = lookupResultsBody.querySelectorAll('.lookup-patient-row');
        rows.forEach(row => {
          row.addEventListener('click', () => {
            const bed = row.getAttribute('data-bed');
            openPatientReport(bed, 'lookup');
          });

          row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              row.click();
            }
          });
        });
      }
    } else {
      // No matches found
      if (lookupInitialState) lookupInitialState.style.display = 'none';
      if (lookupResultsSection) lookupResultsSection.style.display = 'none';
      if (lookupNoResultsState) lookupNoResultsState.style.display = 'flex';
      if (noMatchQueryText) noMatchQueryText.textContent = query;
    }
  }

  if (lookupPatientInput) {
    lookupPatientInput.addEventListener('input', handleLookupInput);
  }

  if (lookupClearBtn) {
    lookupClearBtn.addEventListener('click', () => {
      if (lookupPatientInput) {
        lookupPatientInput.value = '';
        lookupPatientInput.focus();
        handleLookupInput();
      }
    });
  }

  // Top-bar search integration: jumping to Lookup or Report
  if (globalPatientSearch) {
    globalPatientSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalPatientSearch.value.trim();
        if (query) {
          navigateTo('dashboard', 'lookup');
          if (lookupPatientInput) {
            lookupPatientInput.value = query;
            handleLookupInput();
          }
        }
      }
    });
  }

  /* ==========================================================================
     PART B: PATIENT FULL REPORT ENGINE
     ========================================================================== */
  /**
   * Open Patient Full Report for a specific patient
   * @param {string} bedNumber - e.g. "4B-07"
   * @param {string} fromTab - 'ward' | 'surveillance' | 'lookup'
   */
  function openPatientReport(bedNumber, fromTab = 'ward') {
    const patient = mockPatients.find(p => p.bedNumber === bedNumber) || mockPatients[0];
    currentReportPatient = patient;
    lastActiveDashboardTab = fromTab;

    // Persist active selection
    sessionStorage.setItem('selected_patient_bed', patient.bedNumber);

    // Populate Report Header Back Button
    if (reportBackBtn) {
      if (fromTab === 'surveillance') {
        reportBackBtn.textContent = '← Back to high surveillance';
      } else if (fromTab === 'lookup') {
        reportBackBtn.textContent = '← Back to search';
      } else {
        reportBackBtn.textContent = '← Back to ward overview';
      }
    }

    if (reportTimestampText) {
      reportTimestampText.textContent = `Last updated: ${patient.lastUpdated}`;
    }

    // Populate Hero Status Card
    if (reportTierIndicator) {
      reportTierIndicator.className = `report-tier-bar tier-bar-${patient.tier}`;
    }

    if (reportPatientName) reportPatientName.textContent = patient.patientName;
    if (reportPatientMeta) {
      reportPatientMeta.textContent = `${patient.demographics}  |  Bed ${patient.bedNumber}  |  ${patient.ward} (${patient.department})`;
    }
    if (reportWhyText) reportWhyText.textContent = patient.whyOneLine;

    // Score Panel
    if (reportScoreBox) {
      reportScoreBox.className = `report-score-panel score-panel-${patient.tier}`;
    }
    if (reportScoreValue) reportScoreValue.textContent = patient.currentScore;
    if (reportScoreLabel) {
      const labels = { high: 'High risk', medium: 'Medium risk', low: 'Low risk' };
      reportScoreLabel.textContent = labels[patient.tier] || 'Low risk';
    }

    // Trend Panel
    if (reportTrendValue) {
      let trendText = '— Stable';
      let trendClass = 'trend-stable';
      if (patient.trend === 'rising') {
        trendText = '↗ Rising';
        trendClass = 'trend-rising';
      } else if (patient.trend === 'falling') {
        trendText = '↘ Falling';
        trendClass = 'trend-falling';
      }
      reportTrendValue.textContent = trendText;
      reportTrendValue.className = `report-trend-arrow-text ${trendClass}`;
    }

    // Populate Current Vitals Strip
    const vitals = patient.vitals || {
      respiratoryRate: 24, rrStatus: 'rising',
      oxygenSaturation: 91, spo2Status: 'falling',
      systolicBP: 98, bpStatus: 'stable',
      pulse: 102, pulseStatus: 'stable',
      temperature: 37.8, tempStatus: 'stable'
    };

    if (vitalValRr) vitalValRr.textContent = vitals.respiratoryRate;
    if (vitalStatusRr) {
      vitalStatusRr.textContent = `(${vitals.rrStatus})`;
      vitalStatusRr.className = `vital-tile-status status-${vitals.rrStatus}`;
    }

    if (vitalValSpo2) vitalValSpo2.textContent = vitals.oxygenSaturation;
    if (vitalStatusSpo2) {
      vitalStatusSpo2.textContent = `(${vitals.spo2Status})`;
      vitalStatusSpo2.className = `vital-tile-status status-${vitals.spo2Status}`;
    }

    if (vitalValBp) vitalValBp.textContent = vitals.systolicBP;
    if (vitalStatusBp) {
      vitalStatusBp.textContent = `(${vitals.bpStatus})`;
      vitalStatusBp.className = `vital-tile-status status-${vitals.bpStatus}`;
    }

    if (vitalValPulse) vitalValPulse.textContent = vitals.pulse;
    if (vitalStatusPulse) {
      vitalStatusPulse.textContent = `(${vitals.pulseStatus})`;
      vitalStatusPulse.className = `vital-tile-status status-${vitals.pulseStatus}`;
    }

    if (vitalValTemp) vitalValTemp.textContent = vitals.temperature;
    if (vitalStatusTemp) {
      vitalStatusTemp.textContent = `(${vitals.tempStatus})`;
      vitalStatusTemp.className = `vital-tile-status status-${vitals.tempStatus}`;
    }

    // Populate Alert History Table
    if (reportAlertsBody) {
      const alerts = patient.alerts && patient.alerts.length > 0 ? patient.alerts : [
        { time: "14:02", event: "Flagged high", tier: "high", details: `${patient.whyOneLine}` },
        { time: "09:30", event: "Observations updated", tier: "neutral", details: "Vitals resampled" }
      ];

      reportAlertsBody.innerHTML = alerts.map(a => `
        <div class="report-alert-row" role="row">
          <div class="col-alert-time">${a.time}</div>
          <div class="col-alert-event">
            <span class="summary-dot ${a.tier === 'high' ? 'dot-high' : a.tier === 'medium' ? 'dot-medium' : a.tier === 'low' ? 'dot-low' : ''}" style="${a.tier === 'neutral' ? 'background-color: #64748B;' : ''}" aria-hidden="true"></span>
            <span class="event-text">${a.event}</span>
          </div>
          <div class="col-alert-details">${a.details}</div>
        </div>
      `).join('');
    }

    // Transition view inside dashboard shell
    navigateTo('dashboard', `patient/${patient.bedNumber}`);
  }

  // Report Back Button Click
  if (reportBackBtn) {
    reportBackBtn.addEventListener('click', () => {
      navigateTo('dashboard', lastActiveDashboardTab || 'ward');
    });
  }

  // Report Refresh Button Animation
  if (reportRefreshBtn) {
    reportRefreshBtn.addEventListener('click', () => {
      if (reportTimestampText) {
        reportTimestampText.textContent = 'Updating...';
        setTimeout(() => {
          reportTimestampText.textContent = 'Last updated: Just now';
        }, 500);
      }
    });
  }

  /**
   * Router: Switch between top-level views
   * @param {string} viewName - 'landing' | 'login' | 'dashboard'
   * @param {string} subView - 'ward' | 'surveillance' | 'lookup' | 'alerts' | 'patient/{id}'
   */
  function navigateTo(viewName, subView = 'ward') {
    if (landingPageView) landingPageView.classList.remove('active');
    if (loginPageView) loginPageView.classList.remove('active');
    if (dashboardShellView) dashboardShellView.classList.remove('active');

    if (viewName === 'login') {
      if (loginPageView) loginPageView.classList.add('active');
      window.scrollTo(0, 0);
      window.location.hash = 'login';
      
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
      if (landingPageView) landingPageView.classList.add('active');
      window.scrollTo(0, 0);
      window.location.hash = 'landing';
    }
  }

  /**
   * Switch the active slot inside the Dashboard Shell
   * @param {string} targetKey - 'ward' | 'surveillance' | 'lookup' | 'alerts' | 'patient/{id}'
   */
  function switchDashboardSlot(targetKey) {
    const isPatientReport = targetKey.startsWith('patient/');

    // Sidebar active styling
    sidebarNavLinks.forEach((btn) => {
      const linkTarget = btn.getAttribute('data-target');
      if (!isPatientReport && linkTarget === targetKey) {
        btn.classList.add('active');
      } else if (isPatientReport && linkTarget === lastActiveDashboardTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Subview display toggling
    if (wardOverviewView) wardOverviewView.style.display = 'none';
    if (highSurveillanceView) highSurveillanceView.style.display = 'none';
    if (patientLookupView) patientLookupView.style.display = 'none';
    if (patientReportView) patientReportView.style.display = 'none';
    if (genericTabPlaceholder) genericTabPlaceholder.style.display = 'none';

    if (isPatientReport) {
      if (patientReportView) patientReportView.style.display = 'block';
    } else if (targetKey === 'ward') {
      lastActiveDashboardTab = 'ward';
      if (wardOverviewView) wardOverviewView.style.display = 'block';
      renderWardPatients();
    } else if (targetKey === 'surveillance') {
      lastActiveDashboardTab = 'surveillance';
      if (highSurveillanceView) highSurveillanceView.style.display = 'block';
      renderHighSurveillance();
    } else if (targetKey === 'lookup') {
      lastActiveDashboardTab = 'lookup';
      if (patientLookupView) patientLookupView.style.display = 'block';
      if (lookupPatientInput) {
        setTimeout(() => lookupPatientInput.focus(), 80);
      }
    } else {
      // Future tabs (e.g. alerts history)
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
      const rawSub = window.location.hash.substring('#dashboard/'.length) || 'ward';
      if (rawSub.startsWith('patient/')) {
        const bed = rawSub.split('/')[1] || '4B-07';
        openPatientReport(bed, lastActiveDashboardTab || 'ward');
      } else {
        navigateTo('dashboard', rawSub);
      }
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

      if (!usernameVal) {
        if (groupUsername) groupUsername.classList.add('has-error');
        hasError = true;
      } else {
        if (groupUsername) groupUsername.classList.remove('has-error');
      }

      if (!passwordVal) {
        if (groupPassword) groupPassword.classList.add('has-error');
        hasError = true;
      } else {
        if (groupPassword) groupPassword.classList.remove('has-error');
      }

      if (hasError) return;

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
