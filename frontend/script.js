/**
 * Aarogya — Patient Deterioration Forecasting System
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
  const aarogyaLoginForm = document.getElementById('aarogya-login-form');
  const usernameInput = document.getElementById('aarogya-username');
  const passwordInput = document.getElementById('aarogya-password');
  const groupUsername = document.getElementById('group-username');
  const groupPassword = document.getElementById('group-password');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const signingInState = document.getElementById('signing-in-state');

  // Dashboard Subviews
  const wardOverviewView = document.getElementById('ward-overview-view');
  const highSurveillanceView = document.getElementById('high-surveillance-view');
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
  const patientLookupView = document.getElementById('patient-lookup-view');
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

  // Alerts History Elements
  const alertsHistoryView = document.getElementById('alerts-history-view');
  const alertsTableWrapper = document.getElementById('alerts-table-wrapper');
  const alertsTableBody = document.getElementById('alerts-table-body');
  const alertsEmptyState = document.getElementById('alerts-empty-state');
  const alertsEndNote = document.getElementById('alerts-end-note');
  const filterEventType = document.getElementById('filter-event-type');
  const filterWard = document.getElementById('filter-ward');
  const filterDateRange = document.getElementById('filter-date-range');
  const alertsEventCount = document.getElementById('alerts-event-count');
  const alertsClearBtn = document.getElementById('alerts-clear-btn');
  const alertStatActive = document.getElementById('alert-stat-active');
  const alertStatTotal = document.getElementById('alert-stat-total');
  const alertStatEarly = document.getElementById('alert-stat-early');

  // State Tracking
  let lastActiveDashboardTab = 'ward'; // 'ward' | 'surveillance' | 'lookup' | 'alerts'
  let currentReportPatient = null;

  // ==========================================================================
  // BACKEND, SUPABASE & MODEL INTEGRATION ENGINE
  // ==========================================================================
  const API_BASE_URL = 'http://127.0.0.1:8000';
  let isBackendConnected = false;

  function getPatientDbId(patient) {
    if (!patient) return 'P001';
    if (patient.dbId) return patient.dbId;
    if (patient.id && /^P\d{3}$/i.test(patient.id)) return patient.id.toUpperCase();
    if (patient.bedNumber) {
      const match = patient.bedNumber.match(/4B-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return `P${num.toString().padStart(3, '0')}`;
      }
    }
    return 'P001';
  }

  function updateStatusBadge(connected) {
    const pill = document.getElementById('system-status-pill');
    const dot = document.getElementById('system-status-dot');
    const text = document.getElementById('system-status-text');
    if (!pill || !dot || !text) return;

    if (connected) {
      pill.className = 'system-status-pill status-connected';
      dot.className = 'status-indicator-dot dot-live';
      text.textContent = 'Live: Backend, DB & Model Connected';
    } else {
      pill.className = 'system-status-pill status-fallback';
      dot.className = 'status-indicator-dot dot-fallback';
      text.textContent = 'Demo Mode (Backend Offline)';
    }
  }

  async function checkBackendHealth() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        isBackendConnected = true;
        updateStatusBadge(true);
        return true;
      }
    } catch (err) {
      // Backend offline
    }
    isBackendConnected = false;
    updateStatusBadge(false);
    return false;
  }

  async function fetchLivePatients() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`${API_BASE_URL}/patients`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          data.forEach(lp => {
            const idx = mockPatients.findIndex(p => p.bedNumber === lp.bedNumber || p.id === lp.id);
            if (idx !== -1) {
              mockPatients[idx] = { ...mockPatients[idx], ...lp };
            } else {
              mockPatients.push(lp);
            }
          });
          isBackendConnected = true;
          updateStatusBadge(true);
          if (typeof renderWardPatients === 'function') renderWardPatients();
          if (typeof renderHighSurveillance === 'function') renderHighSurveillance();
        }
      }
    } catch (err) {
      console.warn('Could not fetch live patients:', err);
    }
  }

  async function fetchPatientLiveInference(patient) {
    const mlScoreVal = document.getElementById('ml-risk-score');
    const mlRiskTier = document.getElementById('ml-risk-tier');
    const mlAlertText = document.getElementById('ml-alert-text');

    const dbId = getPatientDbId(patient);

    if (!isBackendConnected) {
      const fallbackScore = patient.tier === 'high' ? '0.342' : (patient.tier === 'medium' ? '0.198' : '0.084');
      if (mlScoreVal) mlScoreVal.textContent = fallbackScore;
      if (mlRiskTier) {
        mlRiskTier.textContent = patient.tier.toUpperCase();
        mlRiskTier.className = `ml-score-tier tier-${patient.tier}`;
      }
      if (mlAlertText) {
        mlAlertText.textContent = patient.tier === 'high'
          ? '⚠️ Offline simulation: Deterioration threshold flagged for high-risk vitals.'
          : 'ℹ️ Offline simulation: Vitals monitored within clinical limits.';
      }
      return null;
    }

    try {
      if (mlAlertText) mlAlertText.textContent = `Scoring 30-min window for patient ${dbId} with trained XGBoost model...`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${API_BASE_URL}/predict/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: dbId, minutes: 30 }),
        signal: ctrl.signal
      });
      clearTimeout(t);

      if (res.ok) {
        const pred = await res.json();
        if (mlScoreVal) mlScoreVal.textContent = pred.risk_score.toFixed(3);
        if (mlRiskTier) {
          const tier = (pred.risk_tier || 'LOW').toLowerCase();
          mlRiskTier.textContent = pred.risk_tier;
          mlRiskTier.className = `ml-score-tier tier-${tier}`;
        }
        if (mlAlertText) {
          const alertPct = (pred.risk_score * 100).toFixed(1);
          const thPct = (pred.optimal_threshold * 100).toFixed(1);
          const expl = pred.trend && pred.trend.explanation ? pred.trend.explanation : '';
          if (pred.deterioration_alert) {
            mlAlertText.innerHTML = `🚨 <strong>DETERIORATION ALERT:</strong> XGBoost risk score ${alertPct}% exceeds optimal threshold (${thPct}%). ${expl}`;
          } else {
            mlAlertText.innerHTML = `✅ <strong>STABLE:</strong> XGBoost risk score ${alertPct}% is within safe limit (${thPct}%). ${expl}`;
          }
        }
        return pred;
      }
    } catch (err) {
      console.warn('Inference request failed:', err);
    }
    return null;
  }

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
    }
  ];

  // Shared Mock Alert Events Dataset (Chronological Log of Flag Events)
  const mockAlertEvents = [
    // 18 Sep 2026 (Today)
    {
      id: "EVT-001",
      dateGroup: "18 Sep 2026 (Today)",
      dateCategory: "today",
      time: "14:02",
      patientId: "P-004B-07",
      patientName: "Wilson, Margaret",
      bedNumber: "4B-07",
      ward: "Ward 4B",
      eventType: "escalated",
      eventLabel: "Escalated",
      tier: "high",
      details: "NEWS2 9 — RR rising, SpO₂ falling",
      leadTime: null,
      status: "active"
    },
    {
      id: "EVT-002",
      dateGroup: "18 Sep 2026 (Today)",
      dateCategory: "today",
      time: "11:47",
      patientId: "P-004B-12",
      patientName: "Patel, Rakesh",
      bedNumber: "4B-12",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "high",
      details: "SBP low, rising respiratory rate",
      leadTime: "42 min early",
      status: "active"
    },
    {
      id: "EVT-003",
      dateGroup: "18 Sep 2026 (Today)",
      dateCategory: "today",
      time: "10:15",
      patientId: "P-004B-10",
      patientName: "Chen, Mei",
      bedNumber: "4B-10",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "medium",
      details: "SpO₂ borderline, temperature rising",
      leadTime: "28 min early",
      status: "active"
    },
    {
      id: "EVT-004",
      dateGroup: "18 Sep 2026 (Today)",
      dateCategory: "today",
      time: "08:32",
      patientId: "P-004B-11",
      patientName: "Martin, Oliver",
      bedNumber: "4B-11",
      ward: "Ward 4B",
      eventType: "resolved",
      eventLabel: "Resolved",
      tier: "low",
      details: "Heart rate back in range",
      leadTime: null,
      status: "resolved"
    },
    {
      id: "EVT-005",
      dateGroup: "18 Sep 2026 (Today)",
      dateCategory: "today",
      time: "06:18",
      patientId: "P-004B-03",
      patientName: "O'Connor, Liam",
      bedNumber: "4B-03",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "medium",
      details: "Increasing respiratory rate",
      leadTime: "35 min early",
      status: "active"
    },
    // 17 Sep 2026
    {
      id: "EVT-006",
      dateGroup: "17 Sep 2026",
      dateCategory: "48h",
      time: "22:41",
      patientId: "P-004B-09",
      patientName: "Hughes, Daniel",
      bedNumber: "4B-09",
      ward: "Ward 4B",
      eventType: "resolved",
      eventLabel: "Resolved",
      tier: "low",
      details: "Temperature back in range",
      leadTime: null,
      status: "resolved"
    },
    {
      id: "EVT-007",
      dateGroup: "17 Sep 2026",
      dateCategory: "48h",
      time: "19:26",
      patientId: "P-004B-05",
      patientName: "Khan, Aisha",
      bedNumber: "4B-05",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "medium",
      details: "RR elevated, SpO₂ borderline",
      leadTime: "31 min early",
      status: "resolved"
    },
    {
      id: "EVT-008",
      dateGroup: "17 Sep 2026",
      dateCategory: "48h",
      time: "15:10",
      patientId: "P-004B-06",
      patientName: "Roberts, James",
      bedNumber: "4B-06",
      ward: "Ward 4B",
      eventType: "resolved",
      eventLabel: "Resolved",
      tier: "low",
      details: "All vitals in range",
      leadTime: null,
      status: "resolved"
    },
    {
      id: "EVT-009",
      dateGroup: "17 Sep 2026",
      dateCategory: "48h",
      time: "11:03",
      patientId: "P-004B-04",
      patientName: "Taylor, Emma",
      bedNumber: "4B-04",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "medium",
      details: "Temperature rising",
      leadTime: "26 min early",
      status: "resolved"
    },
    {
      id: "EVT-010",
      dateGroup: "17 Sep 2026",
      dateCategory: "48h",
      time: "08:55",
      patientId: "P-004B-13",
      patientName: "Singh, Arjun",
      bedNumber: "4B-13",
      ward: "Ward 4B",
      eventType: "resolved",
      eventLabel: "Resolved",
      tier: "low",
      details: "Observations stable",
      leadTime: null,
      status: "resolved"
    },
    // 16 Sep 2026
    {
      id: "EVT-011",
      dateGroup: "16 Sep 2026",
      dateCategory: "7d",
      time: "21:14",
      patientId: "P-004B-14",
      patientName: "Clark, Sophie",
      bedNumber: "4B-14",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "high",
      details: "RR rising, low SpO₂",
      leadTime: "50 min early",
      status: "resolved"
    },
    {
      id: "EVT-012",
      dateGroup: "16 Sep 2026",
      dateCategory: "7d",
      time: "17:36",
      patientId: "P-004B-02",
      patientName: "Nguyen, Linh",
      bedNumber: "4B-02",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "medium",
      details: "Systolic BP low, HR elevated",
      leadTime: "22 min early",
      status: "resolved"
    },
    {
      id: "EVT-013",
      dateGroup: "16 Sep 2026",
      dateCategory: "7d",
      time: "13:12",
      patientId: "P-004B-08",
      patientName: "Brown, Thomas",
      bedNumber: "4B-08",
      ward: "Ward 4B",
      eventType: "resolved",
      eventLabel: "Resolved",
      tier: "low",
      details: "All vitals in range",
      leadTime: null,
      status: "resolved"
    },
    {
      id: "EVT-014",
      dateGroup: "16 Sep 2026",
      dateCategory: "7d",
      time: "09:27",
      patientId: "P-004B-01",
      patientName: "Ahmed, Sara",
      bedNumber: "4B-01",
      ward: "Ward 4B",
      eventType: "flagged",
      eventLabel: "Flagged",
      tier: "medium",
      details: "Mildly low BP, increasing RR",
      leadTime: "27 min early",
      status: "resolved"
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
    
    let basePatients = mockPatients;
    if (globalPatientSearch && globalPatientSearch.value.trim() !== '') {
       const q = globalPatientSearch.value.trim().toLowerCase();
       basePatients = basePatients.filter(p => 
         p.patientName.toLowerCase().includes(q) || 
         p.bedNumber.toLowerCase().includes(q) || 
         p.id.toLowerCase().includes(q) ||
         p.ward.toLowerCase().includes(q)
       );
    }

    const sorted = sortPatients(basePatients, currentSort);


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

    let basePatients = mockPatients;
    if (globalPatientSearch && globalPatientSearch.value.trim() !== '') {
       const q = globalPatientSearch.value.trim().toLowerCase();
       basePatients = basePatients.filter(p => 
         p.patientName.toLowerCase().includes(q) || 
         p.bedNumber.toLowerCase().includes(q) || 
         p.id.toLowerCase().includes(q) ||
         p.ward.toLowerCase().includes(q)
       );
    }

    const filtered = basePatients.filter(p => p.tier === "high" || p.trend === "rising");
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

    // Top-bar search integration
  if (globalPatientSearch) {
    globalPatientSearch.addEventListener('input', (e) => {
      // Re-render views on type
      renderWardPatients();
      renderHighSurveillance();
      renderAlertsLog();
    });
    
    globalPatientSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
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
      } else if (fromTab === 'alerts') {
        reportBackBtn.textContent = '← Back to alerts history';
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

    // Populate Top Telemetry Banner Demographics (Image 1)
    const ptIdEl = document.getElementById('telemetry-pt-id');
    if (ptIdEl) ptIdEl.textContent = patient.id || 'PT-1234';
    
    const ptBedEl = document.getElementById('telemetry-pt-bed');
    if (ptBedEl) ptBedEl.textContent = patient.bedNumber ? `BD-${patient.bedNumber.replace(/[^0-9A-Za-z]/g, '')}` : 'BD-198032';

    const ptDoctorEl = document.getElementById('telemetry-pt-doctor');
    if (ptDoctorEl) ptDoctorEl.textContent = patient.doctor || 'Dr. Sharma';

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

    // Populate Current Vitals & Stacked Telemetry Readouts (Matching Image 1)
    const vitals = patient.vitals || {
      respiratoryRate: 24, rrStatus: 'rising',
      oxygenSaturation: 91, spo2Status: 'falling',
      systolicBP: 98, bpStatus: 'stable',
      pulse: 102, pulseStatus: 'stable',
      temperature: 37.8, tempStatus: 'stable'
    };

    const valHrEl = document.getElementById('telemetry-val-hr');
    if (valHrEl) valHrEl.textContent = vitals.pulse;

    const valRrEl = document.getElementById('telemetry-val-rr');
    if (valRrEl) valRrEl.textContent = vitals.respiratoryRate;

    const valBpSysEl = document.getElementById('telemetry-val-bpsys');
    if (valBpSysEl) valBpSysEl.textContent = vitals.systolicBP;

    const valBpDiaEl = document.getElementById('telemetry-val-bpdia');
    if (valBpDiaEl) valBpDiaEl.textContent = Math.round(vitals.systolicBP * 0.65);

    const valSpo2El = document.getElementById('telemetry-val-spo2');
    if (valSpo2El) valSpo2El.textContent = vitals.oxygenSaturation;

    const valTempEl = document.getElementById('telemetry-val-temp');
    if (valTempEl) {
      const tempF = (vitals.temperature * 9 / 5 + 32).toFixed(1);
      valTempEl.textContent = tempF;
    }

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

    // Highlight matching patient card in right-hand Alerts Drawer
    const alertCards = document.querySelectorAll('.telemetry-alert-patient-card');
    alertCards.forEach(c => {
      const bed = c.getAttribute('data-bed');
      if (bed && (bed === patient.bedNumber || patient.bedNumber.includes(bed))) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

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

    // Fetch live model inference from backend/Supabase & render Chart.js graphs
    fetchPatientLiveInference(patient).then(livePred => {
      renderPatientCharts(patient, livePred);
    }).catch(() => {
      renderPatientCharts(patient, null);
    });
  }

  // Bind < All Patients Header Button Click (Image 1)
  const telemetryAllPatientsBtn = document.getElementById('telemetry-all-patients-btn');
  if (telemetryAllPatientsBtn) {
    telemetryAllPatientsBtn.addEventListener('click', () => {
      navigateTo('dashboard', 'ward');
    });
  }

  // Bind Right Alerts Drawer Cards Clicking to Switch Patient Telemetry
  const telemetryAlertsList = document.getElementById('telemetry-alerts-list');
  if (telemetryAlertsList) {
    telemetryAlertsList.addEventListener('click', (e) => {
      const card = e.target.closest('.telemetry-alert-patient-card');
      if (card) {
        const bed = card.getAttribute('data-bed');
        if (bed) {
          openPatientReport(bed, 'vitals');
        }
      }
    });
  }

  // Report Back Button Click
  if (reportBackBtn) {
    reportBackBtn.addEventListener('click', () => {
      navigateTo('dashboard', lastActiveDashboardTab || 'ward');
    });
  }

  // Report Refresh Button Animation & Chart Re-render
  if (reportRefreshBtn) {
    reportRefreshBtn.addEventListener('click', () => {
      if (reportTimestampText) {
        reportTimestampText.textContent = 'Updating live inference...';
        setTimeout(() => {
          reportTimestampText.textContent = 'Last updated: Just now';
          if (currentReportPatient) {
            fetchPatientLiveInference(currentReportPatient).then(livePred => {
              renderPatientCharts(currentReportPatient, livePred);
            }).catch(() => {
              renderPatientCharts(currentReportPatient, null);
            });
          }
        }, 300);
      }
    });
  }

  /* ==========================================================================
     PART B-2: CHART.JS CLINICAL ENGINE & PATIENT CHARTS
     ========================================================================== */
  let patientChartInstances = {};

  function destroyPatientCharts() {
    Object.keys(patientChartInstances).forEach(id => {
      try {
        if (patientChartInstances[id]) {
          patientChartInstances[id].destroy();
        }
      } catch (err) {
        console.warn('Error destroying chart:', err);
      }
      delete patientChartInstances[id];
    });
  }

  /**
   * Generates realistic time series for patient, utilizing live ML forecasts when available
   */
  function generatePatientVitalSeries(patient, livePred = null) {
    // If live model forecast is available from backend
    if (livePred && livePred.vital_forecasts && livePred.vital_forecasts.vitals) {
      const vf = livePred.vital_forecasts.vitals;
      const nf = livePred.news2_forecast || {};
      const labels = ['-30m', '-20m', '-10m', '-5m', 'Now', '+5m', '+10m', '+15m'];

      const v = patient.vitals || {};
      const nowRR = v.respiratoryRate || 20;
      const nowSpo2 = v.oxygenSaturation || 98;
      const nowSBP = v.systolicBP || 120;
      const nowPulse = v.pulse || 72;
      const nowTemp = v.temperature || 36.8;

      const getFc = (vitalObj, nowVal) => {
        if (!vitalObj || !vitalObj.forecast) return [nowVal, nowVal, nowVal];
        const f = vitalObj.forecast;
        return [
          f[4] !== undefined ? f[4] : nowVal,
          f[9] !== undefined ? f[9] : nowVal,
          f[14] !== undefined ? f[14] : nowVal
        ];
      };

      const fcRR = getFc(vf.RespRate, nowRR);
      const fcSpo2 = getFc(vf.SpO2, nowSpo2);
      const fcSBP = getFc(vf.SystolicBP, nowSBP);
      const fcPulse = getFc(vf.PulseRate, nowPulse);
      const fcTemp = getFc(vf.Temperature, nowTemp);

      const makeSeries = (nowVal, fcArr, threshold, unit, minVal, maxVal, decimals = 0) => {
        const trend = (fcArr[2] - nowVal);
        const p1 = decimals > 0 ? parseFloat((nowVal - trend * 0.8).toFixed(decimals)) : Math.round(nowVal - trend * 0.8);
        const p2 = decimals > 0 ? parseFloat((nowVal - trend * 0.5).toFixed(decimals)) : Math.round(nowVal - trend * 0.5);
        const p3 = decimals > 0 ? parseFloat((nowVal - trend * 0.2).toFixed(decimals)) : Math.round(nowVal - trend * 0.2);
        const p4 = decimals > 0 ? parseFloat((nowVal - trend * 0.05).toFixed(decimals)) : Math.round(nowVal - trend * 0.05);

        const clamp = (val) => Math.max(minVal, Math.min(maxVal, val));
        const roundVal = (val) => decimals > 0 ? parseFloat(clamp(val).toFixed(decimals)) : Math.round(clamp(val));

        const actual = [roundVal(p1), roundVal(p2), roundVal(p3), roundVal(p4), roundVal(nowVal), null, null, null];
        const forecast = [null, null, null, null, roundVal(nowVal), roundVal(fcArr[0]), roundVal(fcArr[1]), roundVal(fcArr[2])];
        return { actual, forecast, threshold, unit, min: minVal, max: maxVal };
      };

      const currentNews2 = nf.current_score !== undefined ? nf.current_score : (patient.currentScore || 0);
      const nfc = nf.forecast || [currentNews2, currentNews2, currentNews2];
      const nfc1 = nfc[4] !== undefined ? nfc[4] : currentNews2;
      const nfc2 = nfc[9] !== undefined ? nfc[9] : currentNews2;
      const nfc3 = nfc[14] !== undefined ? nfc[14] : currentNews2;

      const news2Actual = [
        Math.max(0, currentNews2 - 2),
        Math.max(0, currentNews2 - 1),
        Math.max(0, currentNews2 - 1),
        currentNews2,
        currentNews2,
        null, null, null
      ];
      const news2Forecast = [
        null, null, null, null,
        currentNews2,
        nfc1, nfc2, nfc3
      ];

      return {
        labels,
        rr: makeSeries(nowRR, fcRR, 21, 'breaths/min', 10, Math.max(35, nowRR + 6)),
        spo2: makeSeries(nowSpo2, fcSpo2, 94, '%', Math.min(80, nowSpo2 - 6), 100),
        sbp: makeSeries(nowSBP, fcSBP, 100, 'mmHg', Math.min(75, nowSBP - 15), Math.max(160, nowSBP + 20)),
        pulse: makeSeries(nowPulse, fcPulse, 91, 'bpm', Math.min(45, nowPulse - 15), Math.max(140, nowPulse + 20)),
        temp: makeSeries(nowTemp, fcTemp, 38.1, '°C', 35.5, Math.max(40.0, nowTemp + 1.0), 1),
        news2: {
          actual: news2Actual,
          forecast: news2Forecast,
          medThreshold: 5,
          highThreshold: 7,
          min: 0,
          max: Math.max(12, currentNews2 + 4)
        }
      };
    }

    const labels = ['-24h', '-18h', '-12h', '-6h', 'Now', '+2h', '+4h', '+6h'];
    const vitals = patient.vitals || {
      respiratoryRate: 20, rrStatus: 'stable',
      oxygenSaturation: 96, spo2Status: 'stable',
      systolicBP: 120, bpStatus: 'stable',
      pulse: 78, pulseStatus: 'stable',
      temperature: 37.0, tempStatus: 'stable'
    };

    // Helper to generate realistic curve given now value, status, and delta step
    function buildCurve(nowVal, status, step, minVal, maxVal, decimals = 0) {
      let past;
      let forecast;

      if (status === 'rising') {
        past = [
          nowVal - step * 3.5,
          nowVal - step * 2.8,
          nowVal - step * 1.9,
          nowVal - step * 0.9,
          nowVal
        ];
        forecast = [
          nowVal,
          nowVal + step * 0.9,
          nowVal + step * 1.8,
          nowVal + step * 2.5
        ];
      } else if (status === 'falling') {
        past = [
          nowVal + step * 3.5,
          nowVal + step * 2.8,
          nowVal + step * 1.9,
          nowVal + step * 0.9,
          nowVal
        ];
        forecast = [
          nowVal,
          nowVal - step * 0.9,
          nowVal - step * 1.8,
          nowVal - step * 2.5
        ];
      } else {
        // Stable
        past = [
          nowVal - step * 0.3,
          nowVal + step * 0.2,
          nowVal - step * 0.2,
          nowVal + step * 0.1,
          nowVal
        ];
        forecast = [
          nowVal,
          nowVal + step * 0.1,
          nowVal,
          nowVal - step * 0.1
        ];
      }

      const clamp = (v) => {
        const c = Math.max(minVal, Math.min(maxVal, v));
        return decimals > 0 ? parseFloat(c.toFixed(decimals)) : Math.round(c);
      };

      const actual = [...past.map(clamp), null, null, null];
      const fc = [null, null, null, null, clamp(nowVal), ...forecast.slice(1).map(clamp)];
      return { actual, forecast: fc };
    }

    // RR (normal 12-20, threshold >= 21)
    const rrSeries = buildCurve(vitals.respiratoryRate, vitals.rrStatus, 2.2, 8, 45, 0);

    // SpO2 (normal >= 96, threshold < 94)
    const spo2Series = buildCurve(vitals.oxygenSaturation, vitals.spo2Status, 1.3, 75, 100, 0);

    // SBP (normal 111-219, threshold <= 100)
    const sbpSeries = buildCurve(vitals.systolicBP, vitals.bpStatus, 4.5, 60, 200, 0);

    // Pulse (normal 51-90, threshold >= 91)
    const pulseSeries = buildCurve(vitals.pulse, vitals.pulseStatus, 4.0, 40, 160, 0);

    // Temperature (normal 36.1-38.0, threshold >= 38.1)
    const tempSeries = buildCurve(vitals.temperature, vitals.tempStatus, 0.25, 34.5, 41.5, 1);

    // NEWS2 Score
    const currentScore = typeof patient.currentScore === 'number' ? patient.currentScore : 3;
    const news2Series = buildCurve(currentScore, patient.trend, 1.6, 0, 16, 0);

    return {
      labels,
      rr: { ...rrSeries, threshold: 21, unit: 'breaths/min', min: 10, max: Math.max(35, vitals.respiratoryRate + 6) },
      spo2: { ...spo2Series, threshold: 94, unit: '%', min: Math.min(80, vitals.oxygenSaturation - 5), max: 100 },
      sbp: { ...sbpSeries, threshold: 100, unit: 'mmHg', min: Math.min(75, vitals.systolicBP - 15), max: Math.max(160, vitals.systolicBP + 20) },
      pulse: { ...pulseSeries, threshold: 91, unit: 'bpm', min: Math.min(45, vitals.pulse - 15), max: Math.max(140, vitals.pulse + 20) },
      temp: { ...tempSeries, threshold: 38.1, unit: '°C', min: 35.5, max: Math.max(40.0, vitals.temperature + 0.8) },
      news2: { ...news2Series, medThreshold: 5, highThreshold: 7, unit: 'score', min: 0, max: Math.max(12, currentScore + 3) }
    };
  }

  /* ==========================================================================
     PART B-2: DOZEE-STYLE CLINICAL TELEMETRY ENGINE & STRIP CHARTS
     ========================================================================== */
  
  // Register custom Chart.js plugin to draw horizontal shaded risk zones
  const riskBandsPlugin = {
    id: 'riskBands',
    beforeDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      if (!ctx || !chartArea || !scales || !scales.y) return;
      const yScale = scales.y;
      const pluginOpts = chart.config.options?.plugins?.riskBands;
      const bands = pluginOpts?.bands;
      if (!bands || !bands.length) return;

      ctx.save();
      bands.forEach(band => {
        const topVal = Math.min(band.max, yScale.max);
        const btmVal = Math.max(band.min, yScale.min);
        if (topVal >= btmVal) {
          const yTop = yScale.getPixelForValue(topVal);
          const yBottom = yScale.getPixelForValue(btmVal);
          const h = Math.abs(yBottom - yTop);
          if (h > 0) {
            ctx.fillStyle = band.color;
            ctx.fillRect(chartArea.left, Math.min(yTop, yBottom), chartArea.width, h);
          }
        }
      });
      ctx.restore();
    }
  };

  if (typeof Chart !== 'undefined') {
    Chart.register(riskBandsPlugin);
  }

  function createTelemetryStripChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: config.labels,
        datasets: [
          {
            label: config.name,
            data: config.data,
            borderColor: '#1E293B',
            backgroundColor: 'transparent',
            borderWidth: 2.2,
            tension: 0.28,
            pointRadius: (ctx) => (ctx.dataIndex === config.data.length - 1 ? 4.5 : 3),
            pointHoverRadius: 5.5,
            pointBackgroundColor: (ctx) => (ctx.dataIndex === config.data.length - 1 ? '#0F172A' : '#1E293B'),
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 1.5,
            fill: false,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        layout: {
          padding: { top: 3, bottom: 3, left: 2, right: 6 }
        },
        plugins: {
          legend: { display: false },
          riskBands: {
            bands: config.bands || []
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: '#0F172A',
            titleColor: '#F8FAFC',
            bodyColor: '#FFFFFF',
            titleFont: { family: "'Public Sans', sans-serif", size: 11, weight: '700' },
            bodyFont: { family: "'Public Sans', sans-serif", size: 11 },
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              title: (items) => `${items[0].label} (Ward Telemetry)`,
              label: (item) => ` ${config.name}: ${item.raw} ${config.unit || ''}`
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: {
              display: true,
              color: 'rgba(148, 163, 184, 0.2)',
              drawBorder: false
            }
          },
          y: {
            min: config.min,
            max: config.max,
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: '#64748B',
              font: { family: "'Public Sans', sans-serif", size: 9, weight: '600' },
              maxTicksLimit: 3,
              padding: 4
            }
          }
        }
      }
    });

    patientChartInstances[canvasId] = chart;
  }

  function renderPatientCharts(patient, livePred = null) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is not yet loaded, retrying...');
      setTimeout(() => renderPatientCharts(patient, livePred), 200);
      return;
    }

    destroyPatientCharts();

    const timeLabels = ['12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm'];
    const v = patient.vitals || {
      respiratoryRate: 20,
      oxygenSaturation: 96,
      systolicBP: 120,
      pulse: 78,
      temperature: 37.0
    };

    const currentEWS = typeof patient.currentScore === 'number' ? patient.currentScore : 2;
    const currentHR = v.pulse || 75;
    const currentRR = v.respiratoryRate || 16;
    const currentSysBP = v.systolicBP || 120;
    const currentDiaBP = Math.round(currentSysBP * 0.65);
    const currentSpo2 = v.oxygenSaturation || 98;
    const currentTempF = parseFloat((v.temperature * 9 / 5 + 32).toFixed(1));

    // Generate smooth 14-tick observation trajectory ending at current vital value
    const generateTrajectory = (targetVal, variance, min, max, decimals = 0) => {
      const arr = [];
      let cur = targetVal - (patient.trend === 'rising' ? variance * 2.5 : (patient.trend === 'falling' ? -variance * 2.5 : variance * 0.4));
      for (let i = 0; i < 14; i++) {
        if (i === 13) {
          arr.push(targetVal);
        } else {
          const step = (targetVal - cur) / (14 - i);
          const noise = (Math.sin(i * 1.5) * variance * 0.35);
          cur = Math.max(min, Math.min(max, cur + step + noise));
          arr.push(decimals > 0 ? parseFloat(cur.toFixed(decimals)) : Math.round(cur));
        }
      }
      return arr;
    };

    // 1. EWS (NEWS2) Strip
    createTelemetryStripChart('telemetry-chart-ews', {
      name: 'EWS',
      unit: '',
      min: 0,
      max: 12,
      labels: timeLabels,
      data: generateTrajectory(currentEWS, 1.8, 0, 12, 0),
      bands: [
        { min: 7, max: 12, color: '#FEE2E2' },
        { min: 4, max: 7, color: '#FEF3C7' },
        { min: 0, max: 4, color: '#DCFCE7' }
      ]
    });

    // 2. HR (Heart Rate / BPM)
    createTelemetryStripChart('telemetry-chart-hr', {
      name: 'HR',
      unit: 'BPM',
      min: 40,
      max: 140,
      labels: timeLabels,
      data: generateTrajectory(currentHR, 6, 40, 140, 0),
      bands: [
        { min: 120, max: 140, color: '#FEE2E2' },
        { min: 90, max: 120, color: '#FEF3C7' },
        { min: 50, max: 90, color: '#DCFCE7' },
        { min: 40, max: 50, color: '#FEF3C7' }
      ]
    });

    // 3. RR (Respiratory Rate / RPM)
    createTelemetryStripChart('telemetry-chart-rr', {
      name: 'RR',
      unit: 'RPM',
      min: 6,
      max: 32,
      labels: timeLabels,
      data: generateTrajectory(currentRR, 3.5, 6, 32, 0),
      bands: [
        { min: 24, max: 32, color: '#FEE2E2' },
        { min: 20, max: 24, color: '#FEF3C7' },
        { min: 12, max: 20, color: '#DCFCE7' },
        { min: 6, max: 12, color: '#FEF3C7' }
      ]
    });

    // 4. BP(Sys) (Systolic Blood Pressure / mmHg)
    createTelemetryStripChart('telemetry-chart-bpsys', {
      name: 'BP(Sys)',
      unit: 'mmHg',
      min: 70,
      max: 180,
      labels: timeLabels,
      data: generateTrajectory(currentSysBP, 8, 70, 180, 0),
      bands: [
        { min: 160, max: 180, color: '#FEE2E2' },
        { min: 140, max: 160, color: '#FEF3C7' },
        { min: 100, max: 140, color: '#DCFCE7' },
        { min: 70, max: 100, color: '#FEE2E2' }
      ]
    });

    // 5. BP(Dia) (Diastolic Blood Pressure / mmHg)
    createTelemetryStripChart('telemetry-chart-bpdia', {
      name: 'BP(Dia)',
      unit: 'mmHg',
      min: 45,
      max: 110,
      labels: timeLabels,
      data: generateTrajectory(currentDiaBP, 5, 45, 110, 0),
      bands: [
        { min: 95, max: 110, color: '#FEE2E2' },
        { min: 85, max: 95, color: '#FEF3C7' },
        { min: 55, max: 85, color: '#DCFCE7' },
        { min: 45, max: 55, color: '#FEF3C7' }
      ]
    });

    // 6. SpO2 (Oxygen Saturation / %)
    createTelemetryStripChart('telemetry-chart-spo2', {
      name: 'SpO₂',
      unit: '%',
      min: 84,
      max: 100,
      labels: timeLabels,
      data: generateTrajectory(currentSpo2, 2.2, 84, 100, 0),
      bands: [
        { min: 96, max: 100, color: '#DCFCE7' },
        { min: 92, max: 96, color: '#FEF3C7' },
        { min: 84, max: 92, color: '#FEE2E2' }
      ]
    });

    // 7. Temp (Temperature / °F)
    createTelemetryStripChart('telemetry-chart-temp', {
      name: 'Temp',
      unit: '°F',
      min: 96.0,
      max: 104.0,
      labels: timeLabels,
      data: generateTrajectory(currentTempF, 0.6, 96.0, 104.0, 1),
      bands: [
        { min: 100.4, max: 104.0, color: '#FEE2E2' },
        { min: 99.4, max: 100.4, color: '#FEF3C7' },
        { min: 97.0, max: 99.4, color: '#DCFCE7' },
        { min: 96.0, max: 97.0, color: '#FEF3C7' }
      ]
    });
  }

  /* ==========================================================================
     PART C: ALERTS / HISTORY LOG ENGINE
     ========================================================================== */
  function renderAlertsLog() {
    if (!alertsTableBody) return;

    const eventType = filterEventType ? filterEventType.value : 'all';
    const ward = filterWard ? filterWard.value : '4B';
    const dateRange = filterDateRange ? filterDateRange.value : '7d';

    let baseEvents = mockAlertEvents;
    if (globalPatientSearch && globalPatientSearch.value.trim() !== '') {
       const q = globalPatientSearch.value.trim().toLowerCase();
       baseEvents = baseEvents.filter(evt => 
         evt.patientName.toLowerCase().includes(q) || 
         evt.patientId.toLowerCase().includes(q) || 
         evt.bedNumber.toLowerCase().includes(q) ||
         evt.ward.toLowerCase().includes(q)
       );
    }

    let filtered = baseEvents.filter(evt => {

      // Event Type filter
      if (eventType === 'active' && evt.status !== 'active') return false;
      if (eventType === 'flagged' && evt.eventType !== 'flagged') return false;
      if (eventType === 'escalated' && evt.eventType !== 'escalated') return false;
      if (eventType === 'resolved' && evt.eventType !== 'resolved') return false;

      // Ward filter
      if (ward !== 'all' && !evt.ward.includes(ward)) return false;

      // Date Range filter
      if (dateRange === 'today' && evt.dateCategory !== 'today') return false;
      if (dateRange === '48h' && evt.dateCategory !== 'today' && evt.dateCategory !== '48h') return false;

      return true;
    });

    // Update Counts & Summary Blocks
    if (alertsEventCount) {
      alertsEventCount.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'}`;
    }

    if (alertStatTotal) alertStatTotal.textContent = filtered.length;
    if (alertStatActive) alertStatActive.textContent = filtered.filter(e => e.status === 'active').length;
    if (alertStatEarly) alertStatEarly.textContent = filtered.filter(e => e.leadTime).length;

    // Handle Empty State
    if (filtered.length === 0) {
      if (alertsTableWrapper) alertsTableWrapper.style.display = 'none';
      if (alertsEndNote) alertsEndNote.style.display = 'none';
      if (alertsEmptyState) alertsEmptyState.style.display = 'flex';
      alertsTableBody.innerHTML = '';
      return;
    }

    if (alertsTableWrapper) alertsTableWrapper.style.display = 'block';
    if (alertsEndNote) alertsEndNote.style.display = 'block';
    if (alertsEmptyState) alertsEmptyState.style.display = 'none';

    // Group filtered events by dateGroup
    const groups = {};
    filtered.forEach(evt => {
      if (!groups[evt.dateGroup]) {
        groups[evt.dateGroup] = [];
      }
      groups[evt.dateGroup].push(evt);
    });

    let html = '';
    Object.keys(groups).forEach(dateHeader => {
      html += `<div class="alerts-date-group-header" role="rowgroup">${dateHeader}</div>`;

      groups[dateHeader].forEach(evt => {
        let eventIconHtml = '';
        if (evt.eventType === 'escalated') {
          eventIconHtml = `
            <span class="event-icon-flag-high" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M4 2v20M4 4h14l-2.5 5 2.5 5H4"/>
              </svg>
            </span>
          `;
        } else if (evt.eventType === 'flagged') {
          const isHigh = evt.tier === 'high';
          eventIconHtml = `
            <span class="${isHigh ? 'event-icon-flag-high' : 'event-icon-flag-med'}" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M4 2v20M4 4h14l-2.5 5 2.5 5H4"/>
              </svg>
            </span>
          `;
        } else {
          eventIconHtml = `
            <span class="event-icon-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#159A72" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" fill="#DCFCE7" stroke="none"></circle>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </span>
          `;
        }

        const tierCapitalized = evt.tier.charAt(0).toUpperCase() + evt.tier.slice(1);
        const statusCapitalized = evt.status === 'active' ? 'Active' : 'Resolved';

        const leadTimeHtml = evt.leadTime 
          ? `<span class="lead-time-val">${evt.leadTime}</span>`
          : `<span class="lead-time-empty">-</span>`;

        html += `
          <div class="alert-log-row" data-bed="${evt.bedNumber}" data-patient="${evt.patientName}" role="row" tabindex="0">
            <div class="col-alert-dt" role="cell">${evt.time}</div>
            <div class="col-alert-pt" role="cell">
              <span class="col-alert-pt-name">${evt.patientName}</span>
              <span class="col-alert-pt-bed">Bed ${evt.bedNumber}</span>
            </div>
            <div class="col-alert-type" role="cell">
              ${eventIconHtml}
              <span>${evt.eventLabel}</span>
            </div>
            <div class="col-alert-tier" role="cell">
              <span class="tier-pill tier-pill-${evt.tier}">${tierCapitalized}</span>
            </div>
            <div class="col-alert-desc" role="cell">${evt.details}</div>
            <div class="col-alert-lead" role="cell">${leadTimeHtml}</div>
            <div class="col-alert-stat" role="cell">
              <span class="status-pill status-pill-${evt.status}">${statusCapitalized}</span>
            </div>
            <div class="col-alert-chev" role="cell" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        `;
      });
    });

    alertsTableBody.innerHTML = html;

    // Attach row click listeners -> Navigate to patient full report
    const rows = alertsTableBody.querySelectorAll('.alert-log-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const bed = row.getAttribute('data-bed');
        openPatientReport(bed, 'alerts');
      });

      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          row.click();
        }
      });
    });
  }

  // Filter Event Listeners
  if (filterEventType) {
    filterEventType.addEventListener('change', renderAlertsLog);
  }

  if (filterWard) {
    filterWard.addEventListener('change', renderAlertsLog);
  }

  if (filterDateRange) {
    filterDateRange.addEventListener('change', renderAlertsLog);
  }

  if (alertsClearBtn) {
    alertsClearBtn.addEventListener('click', () => {
      if (filterEventType) filterEventType.value = 'all';
      if (filterWard) filterWard.value = '4B';
      if (filterDateRange) filterDateRange.value = '7d';
      renderAlertsLog();
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
    const topbarSearch = document.querySelector('.topbar-search-wrap'); if(topbarSearch) topbarSearch.style.visibility = (targetKey === 'lookup') ? 'hidden' : 'visible';
    const isPatientReport = targetKey.startsWith('patient/');

    // Sidebar active styling
    sidebarNavLinks.forEach((btn) => {
      const linkTarget = btn.getAttribute('data-target');
      if (!isPatientReport && linkTarget === targetKey) {
        btn.classList.add('active');
      } else if (isPatientReport && (linkTarget === 'vitals' || linkTarget === lastActiveDashboardTab)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Subview display toggling
    if (wardOverviewView) wardOverviewView.style.display = 'none';
    if (patientLookupView) patientLookupView.style.display = 'none';
    if (highSurveillanceView) highSurveillanceView.style.display = 'none';
    
    if (patientReportView) patientReportView.style.display = 'none';
    if (alertsHistoryView) alertsHistoryView.style.display = 'none';

    if (isPatientReport) {
      if (patientReportView) patientReportView.style.display = 'block';
    } else if (targetKey === 'vitals') {
      lastActiveDashboardTab = 'vitals';
      const bed = sessionStorage.getItem('selected_patient_bed') || (currentReportPatient ? currentReportPatient.bedNumber : '4B-07');
      openPatientReport(bed, 'vitals');
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
        setTimeout(() => lookupPatientInput.focus(), 50);
        handleLookupInput();
      }
    } else if (targetKey === 'alerts') {
      lastActiveDashboardTab = 'alerts';
      if (alertsHistoryView) alertsHistoryView.style.display = 'block';
      renderAlertsLog();
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
      sessionStorage.removeItem('aarogya_auth');
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
  if (aarogyaLoginForm) {
    aarogyaLoginForm.addEventListener('submit', (e) => {
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

      sessionStorage.setItem('aarogya_auth', JSON.stringify({
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

  // Connect to Backend, Supabase & ML Model
  checkBackendHealth().then(connected => {
    if (connected) {
      fetchLivePatients();
    }
  });

  // Auto-refresh health and live patients every 20 seconds
  setInterval(() => {
    checkBackendHealth().then(connected => {
      if (connected) fetchLivePatients();
    });
  }, 20000);
});
